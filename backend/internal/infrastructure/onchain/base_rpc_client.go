package onchain

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/moneyvessel/kifu/internal/services"
	"golang.org/x/crypto/sha3"
)

var erc20TransferTopic = computeTransferTopic()

const (
	logsChunkSize     uint64 = 20000
	maxLookbackBlocks uint64 = 120000
)

type BaseRPCClient struct {
	rpcURL string
	client *http.Client

	mu             sync.RWMutex
	blockTimeCache map[uint64]time.Time
}

func NewBaseRPCClient(rpcURL string) *BaseRPCClient {
	trimmed := strings.TrimSpace(rpcURL)
	if trimmed == "" {
		trimmed = "https://mainnet.base.org"
	}
	return &BaseRPCClient{
		rpcURL: trimmed,
		client: &http.Client{
			Timeout: 90 * time.Second,
		},
		blockTimeCache: make(map[uint64]time.Time),
	}
}

func computeTransferTopic() string {
	hasher := sha3.NewLegacyKeccak256()
	_, _ = hasher.Write([]byte("Transfer(address,address,uint256)"))
	return "0x" + hex.EncodeToString(hasher.Sum(nil))
}

func (c *BaseRPCClient) ListERC20Transfers(ctx context.Context, address string, startTime, endTime time.Time) ([]services.TransferEvent, error) {
	latestBlock, err := c.getLatestBlockNumber(ctx)
	if err != nil {
		return nil, err
	}

	startBlock := estimateStartBlock(latestBlock, startTime.UTC(), endTime.UTC())

	addressTopic := addressToTopic(address)
	baseTopic := erc20TransferTopic

	fromLogs, fromErr := c.fetchLogsChunked(ctx, startBlock, latestBlock, []interface{}{baseTopic, addressTopic, nil})
	if fromErr != nil {
		return nil, fromErr
	}
	toLogs, toErr := c.fetchLogsChunked(ctx, startBlock, latestBlock, []interface{}{baseTopic, nil, addressTopic})
	if toErr != nil {
		return nil, toErr
	}

	byKey := make(map[string]services.TransferEvent, len(fromLogs)+len(toLogs))
	startUTC := startTime.UTC()
	endUTC := endTime.UTC()

	appendLog := func(item rpcLog) {
		event, parseErr := c.logToEvent(ctx, item)
		if parseErr != nil {
			return
		}

		if !event.Timestamp.IsZero() {
			if event.Timestamp.Before(startUTC) || event.Timestamp.After(endUTC) {
				return
			}
		}

		key := event.TxHash + "|" + strconv.FormatUint(event.LogIndex, 10)
		byKey[key] = event
	}

	for _, item := range fromLogs {
		appendLog(item)
	}
	for _, item := range toLogs {
		appendLog(item)
	}

	events := make([]services.TransferEvent, 0, len(byKey))
	for _, event := range byKey {
		events = append(events, event)
	}

	sort.Slice(events, func(i, j int) bool {
		if events[i].BlockNumber == events[j].BlockNumber {
			return events[i].LogIndex < events[j].LogIndex
		}
		return events[i].BlockNumber < events[j].BlockNumber
	})

	return events, nil
}

func estimateStartBlock(latest uint64, startTime, endTime time.Time) uint64 {
	if latest == 0 {
		return 0
	}

	window := endTime.Sub(startTime)
	if window <= 0 {
		return latest
	}

	// Base block time is roughly ~2s. Add extra buffer to avoid underfetch.
	estimatedDistance := uint64(window/(2*time.Second)) + 5000
	if estimatedDistance > maxLookbackBlocks {
		estimatedDistance = maxLookbackBlocks
	}
	if estimatedDistance >= latest {
		return 0
	}
	return latest - estimatedDistance
}

type rpcRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      int         `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params"`
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int             `json:"id"`
	Result  json.RawMessage `json:"result"`
	Error   *rpcError       `json:"error"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type rpcCallError struct {
	code    int
	message string
}

func (e *rpcCallError) Error() string {
	return fmt.Sprintf("rpc error code=%d message=%s", e.code, e.message)
}

func (e *rpcCallError) Code() int {
	return e.code
}

func (e *rpcCallError) Message() string {
	return e.message
}

func (c *BaseRPCClient) callRPC(ctx context.Context, method string, params interface{}, out interface{}) error {
	payload, err := json.Marshal(rpcRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  method,
		Params:  params,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.rpcURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("rpc http status=%d", resp.StatusCode)
	}

	var decoded rpcResponse
	if err := json.Unmarshal(body, &decoded); err != nil {
		return err
	}
	if decoded.Error != nil {
		return &rpcCallError{code: decoded.Error.Code, message: decoded.Error.Message}
	}
	if out == nil || len(decoded.Result) == 0 {
		return nil
	}
	return json.Unmarshal(decoded.Result, out)
}

func (c *BaseRPCClient) getLatestBlockNumber(ctx context.Context) (uint64, error) {
	var result string
	if err := c.callRPC(ctx, "eth_blockNumber", []interface{}{}, &result); err != nil {
		return 0, err
	}
	return parseHexUint64(result)
}

type rpcBlock struct {
	Number    string `json:"number"`
	Timestamp string `json:"timestamp"`
}

func (c *BaseRPCClient) getBlockByNumber(ctx context.Context, blockNumber uint64) (rpcBlock, error) {
	var block rpcBlock
	if err := c.callRPC(ctx, "eth_getBlockByNumber", []interface{}{toHex(blockNumber), false}, &block); err != nil {
		return rpcBlock{}, err
	}
	return block, nil
}

func (c *BaseRPCClient) getBlockTime(ctx context.Context, blockNumber uint64) (time.Time, error) {
	c.mu.RLock()
	cached, ok := c.blockTimeCache[blockNumber]
	c.mu.RUnlock()
	if ok {
		return cached, nil
	}

	block, err := c.getBlockByNumber(ctx, blockNumber)
	if err != nil {
		return time.Time{}, err
	}

	tsRaw, err := parseHexUint64(block.Timestamp)
	if err != nil {
		return time.Time{}, err
	}
	ts := time.Unix(int64(tsRaw), 0).UTC()

	c.mu.Lock()
	c.blockTimeCache[blockNumber] = ts
	c.mu.Unlock()
	return ts, nil
}

func (c *BaseRPCClient) findStartBlock(ctx context.Context, target time.Time, latestBlock uint64) (uint64, error) {
	if latestBlock == 0 {
		return 0, nil
	}

	latestTime, err := c.getBlockTime(ctx, latestBlock)
	if err != nil {
		return 0, err
	}
	if target.After(latestTime) {
		return latestBlock, nil
	}

	earliestTime, err := c.getBlockTime(ctx, 0)
	if err == nil && (target.Before(earliestTime) || target.Equal(earliestTime)) {
		return 0, nil
	}

	low := uint64(0)
	high := latestBlock
	for low < high {
		mid := low + (high-low)/2
		midTime, err := c.getBlockTime(ctx, mid)
		if err != nil {
			return 0, err
		}
		if midTime.Before(target) {
			low = mid + 1
		} else {
			high = mid
		}
	}
	return low, nil
}

type rpcLog struct {
	Address         string   `json:"address"`
	Topics          []string `json:"topics"`
	Data            string   `json:"data"`
	BlockNumber     string   `json:"blockNumber"`
	BlockTimestamp  string   `json:"blockTimestamp"`
	TransactionHash string   `json:"transactionHash"`
	LogIndex        string   `json:"logIndex"`
}

func (c *BaseRPCClient) fetchLogs(ctx context.Context, fromBlock, toBlock uint64, topics []interface{}) ([]rpcLog, error) {
	filter := map[string]interface{}{
		"fromBlock": toHex(fromBlock),
		"toBlock":   toHex(toBlock),
		"topics":    topics,
	}

	var logs []rpcLog
	if err := c.callRPC(ctx, "eth_getLogs", []interface{}{filter}, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}

func (c *BaseRPCClient) fetchLogsAdaptive(ctx context.Context, fromBlock, toBlock uint64, topics []interface{}) ([]rpcLog, error) {
	logs, err := c.fetchLogs(ctx, fromBlock, toBlock, topics)
	if err == nil {
		return logs, nil
	}

	if !isRangeTooWideError(err) || fromBlock >= toBlock {
		return nil, err
	}

	mid := fromBlock + (toBlock-fromBlock)/2
	left, leftErr := c.fetchLogsAdaptive(ctx, fromBlock, mid, topics)
	if leftErr != nil {
		return nil, leftErr
	}
	right, rightErr := c.fetchLogsAdaptive(ctx, mid+1, toBlock, topics)
	if rightErr != nil {
		return nil, rightErr
	}

	merged := make([]rpcLog, 0, len(left)+len(right))
	merged = append(merged, left...)
	merged = append(merged, right...)
	return merged, nil
}

func (c *BaseRPCClient) fetchLogsChunked(ctx context.Context, fromBlock, toBlock uint64, topics []interface{}) ([]rpcLog, error) {
	if fromBlock > toBlock {
		return []rpcLog{}, nil
	}

	// Fast path: try single-range query first.
	// For indexed address topics this is often faster and avoids many RPC calls.
	logs, err := c.fetchLogs(ctx, fromBlock, toBlock, topics)
	if err == nil {
		return logs, nil
	}
	if !isRangeTooWideError(err) {
		return nil, err
	}

	all := make([]rpcLog, 0)
	for current := fromBlock; current <= toBlock; {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}

		end := current + logsChunkSize - 1
		if end > toBlock || end < current {
			end = toBlock
		}

		partLogs, partErr := c.fetchLogsAdaptive(ctx, current, end, topics)
		if partErr != nil {
			return nil, partErr
		}
		all = append(all, partLogs...)

		if end == toBlock {
			break
		}
		current = end + 1
	}

	return all, nil
}

func isRangeTooWideError(err error) bool {
	rpcErr, ok := err.(*rpcCallError)
	if ok && rpcErr.Code() == -32005 {
		return true
	}

	msg := strings.ToLower(err.Error())
	if strings.Contains(msg, "too many") {
		return true
	}
	if strings.Contains(msg, "query returned more than") {
		return true
	}
	if strings.Contains(msg, "response size exceeded") {
		return true
	}
	if strings.Contains(msg, "block range") {
		return true
	}
	if strings.Contains(msg, "context deadline exceeded") {
		return true
	}
	if strings.Contains(msg, "client.timeout exceeded") {
		return true
	}
	if strings.Contains(msg, "timeout") {
		return true
	}
	return false
}

func (c *BaseRPCClient) logToEvent(ctx context.Context, logItem rpcLog) (services.TransferEvent, error) {
	if len(logItem.Topics) < 3 {
		return services.TransferEvent{}, fmt.Errorf("invalid topic length: %d", len(logItem.Topics))
	}

	blockNumber, err := parseHexUint64(logItem.BlockNumber)
	if err != nil {
		return services.TransferEvent{}, err
	}
	logIndex, err := parseHexUint64(logItem.LogIndex)
	if err != nil {
		return services.TransferEvent{}, err
	}

	var timestamp time.Time
	if logItem.BlockTimestamp != "" {
		tsRaw, tsErr := parseHexUint64(logItem.BlockTimestamp)
		if tsErr == nil && tsRaw > 0 {
			timestamp = time.Unix(int64(tsRaw), 0).UTC()
		}
	}

	return services.TransferEvent{
		TokenAddress: strings.ToLower(strings.TrimSpace(logItem.Address)),
		From:         topicToAddress(logItem.Topics[1]),
		To:           topicToAddress(logItem.Topics[2]),
		AmountRaw:    hexToDecimal(logItem.Data),
		BlockNumber:  blockNumber,
		TxHash:       strings.ToLower(strings.TrimSpace(logItem.TransactionHash)),
		LogIndex:     logIndex,
		Timestamp:    timestamp,
	}, nil
}

func toHex(value uint64) string {
	return fmt.Sprintf("0x%x", value)
}

func parseHexUint64(raw string) (uint64, error) {
	clean := strings.TrimSpace(raw)
	clean = strings.TrimPrefix(clean, "0x")
	clean = strings.TrimPrefix(clean, "0X")
	if clean == "" {
		return 0, nil
	}
	return strconv.ParseUint(clean, 16, 64)
}

func addressToTopic(address string) string {
	clean := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(address)), "0x")
	return "0x" + strings.Repeat("0", 64-len(clean)) + clean
}

func topicToAddress(topic string) string {
	clean := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(topic)), "0x")
	if len(clean) < 40 {
		return ""
	}
	return "0x" + clean[len(clean)-40:]
}

func hexToDecimal(raw string) string {
	clean := strings.TrimSpace(raw)
	clean = strings.TrimPrefix(clean, "0x")
	clean = strings.TrimPrefix(clean, "0X")
	if clean == "" {
		return "0"
	}

	value := new(big.Int)
	if _, ok := value.SetString(clean, 16); !ok {
		return "0"
	}
	return value.String()
}
