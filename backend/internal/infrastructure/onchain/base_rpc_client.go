package onchain

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/moneyvessel/kifu/internal/services"
)

type BaseRPCClient struct {
	rpcURL string
	client *http.Client
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
	}
}

// ListERC20Transfers uses alchemy_getAssetTransfers to fetch ERC20 transfers.
// This avoids the 10-block eth_getLogs limit on Alchemy Free tier.
func (c *BaseRPCClient) ListERC20Transfers(ctx context.Context, address string, startTime, endTime time.Time) ([]services.TransferEvent, error) {
	normalizedAddr := strings.ToLower(strings.TrimSpace(address))

	// Fetch incoming and outgoing transfers
	inEvents, err := c.fetchAssetTransfers(ctx, "", normalizedAddr, startTime, endTime)
	if err != nil {
		return nil, err
	}
	outEvents, err := c.fetchAssetTransfers(ctx, normalizedAddr, "", startTime, endTime)
	if err != nil {
		return nil, err
	}

	// Deduplicate by txHash|logIndex
	byKey := make(map[string]services.TransferEvent, len(inEvents)+len(outEvents))
	for _, e := range inEvents {
		key := e.TxHash + "|" + strconv.FormatUint(e.LogIndex, 10)
		byKey[key] = e
	}
	for _, e := range outEvents {
		key := e.TxHash + "|" + strconv.FormatUint(e.LogIndex, 10)
		byKey[key] = e
	}

	events := make([]services.TransferEvent, 0, len(byKey))
	for _, e := range byKey {
		events = append(events, e)
	}

	sort.Slice(events, func(i, j int) bool {
		if events[i].BlockNumber == events[j].BlockNumber {
			return events[i].LogIndex < events[j].LogIndex
		}
		return events[i].BlockNumber < events[j].BlockNumber
	})

	return events, nil
}

// alchemyTransferResult represents the alchemy_getAssetTransfers response.
type alchemyTransferResult struct {
	Transfers []alchemyTransfer `json:"transfers"`
	PageKey   string            `json:"pageKey"`
}

type alchemyTransfer struct {
	BlockNum        string            `json:"blockNum"`
	Hash            string            `json:"hash"`
	From            string            `json:"from"`
	To              string            `json:"to"`
	Value           float64           `json:"value"`
	RawContract     alchemyRawContract `json:"rawContract"`
	Metadata        alchemyMetadata   `json:"metadata"`
	Category        string            `json:"category"`
	Asset           string            `json:"asset"`
	UniqueID        string            `json:"uniqueId"`
}

type alchemyRawContract struct {
	Value   string `json:"value"`
	Address string `json:"address"`
	Decimal string `json:"decimal"`
}

type alchemyMetadata struct {
	BlockTimestamp string `json:"blockTimestamp"`
}

func (c *BaseRPCClient) fetchAssetTransfers(ctx context.Context, fromAddr, toAddr string, startTime, endTime time.Time) ([]services.TransferEvent, error) {
	var allEvents []services.TransferEvent
	var pageKey string

	for {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}

		params := map[string]interface{}{
			"category":       []string{"erc20"},
			"withMetadata":   true,
			"order":          "asc",
			"maxCount":       "0x3e8", // 1000 per page
		}
		if fromAddr != "" {
			params["fromAddress"] = fromAddr
		}
		if toAddr != "" {
			params["toAddress"] = toAddr
		}
		if pageKey != "" {
			params["pageKey"] = pageKey
		}

		// Use block hex for fromBlock/toBlock estimation
		// Alchemy also supports fromBlock/toBlock with hex strings
		// We estimate start block from time to limit the range
		startBlock, endBlock, blockErr := c.estimateBlockRange(ctx, startTime, endTime)
		if blockErr != nil {
			return nil, blockErr
		}
		params["fromBlock"] = toHex(startBlock)
		params["toBlock"] = toHex(endBlock)

		var result alchemyTransferResult
		if err := c.callRPC(ctx, "alchemy_getAssetTransfers", []interface{}{params}, &result); err != nil {
			return nil, err
		}

		for _, t := range result.Transfers {
			event := convertAlchemyTransfer(t, startTime, endTime)
			if event.TokenAddress != "" {
				allEvents = append(allEvents, event)
			}
		}

		if result.PageKey == "" {
			break
		}
		pageKey = result.PageKey
	}

	return allEvents, nil
}

func (c *BaseRPCClient) estimateBlockRange(ctx context.Context, startTime, endTime time.Time) (uint64, uint64, error) {
	latestBlock, err := c.getLatestBlockNumber(ctx)
	if err != nil {
		return 0, 0, err
	}

	window := endTime.Sub(startTime)
	if window <= 0 {
		return latestBlock, latestBlock, nil
	}

	// Base block time ~2s, add buffer
	estimatedDistance := uint64(window/(2*time.Second)) + 5000
	const maxLookback uint64 = 120000
	if estimatedDistance > maxLookback {
		estimatedDistance = maxLookback
	}

	startBlock := uint64(0)
	if estimatedDistance < latestBlock {
		startBlock = latestBlock - estimatedDistance
	}

	return startBlock, latestBlock, nil
}

func convertAlchemyTransfer(t alchemyTransfer, startTime, endTime time.Time) services.TransferEvent {
	blockNumber, _ := parseHexUint64(t.BlockNum)

	var timestamp time.Time
	if t.Metadata.BlockTimestamp != "" {
		parsed, err := time.Parse(time.RFC3339, t.Metadata.BlockTimestamp)
		if err == nil {
			timestamp = parsed.UTC()
		}
	}

	// Filter by time range
	if !timestamp.IsZero() {
		if timestamp.Before(startTime.UTC()) || timestamp.After(endTime.UTC()) {
			return services.TransferEvent{}
		}
	}

	// Parse the unique ID to extract log index (format: "txHash:log:logIndex")
	var logIndex uint64
	if t.UniqueID != "" {
		parts := strings.Split(t.UniqueID, ":")
		if len(parts) >= 3 {
			logIndex, _ = strconv.ParseUint(parts[len(parts)-1], 10, 64)
		}
	}

	// Raw amount from contract
	amountRaw := "0"
	if t.RawContract.Value != "" {
		amountRaw = hexToDecimal(t.RawContract.Value)
	}

	return services.TransferEvent{
		TokenAddress: strings.ToLower(strings.TrimSpace(t.RawContract.Address)),
		From:         strings.ToLower(strings.TrimSpace(t.From)),
		To:           strings.ToLower(strings.TrimSpace(t.To)),
		AmountRaw:    amountRaw,
		BlockNumber:  blockNumber,
		TxHash:       strings.ToLower(strings.TrimSpace(t.Hash)),
		LogIndex:     logIndex,
		Timestamp:    timestamp,
	}
}

// --- RPC transport ---

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

func (c *BaseRPCClient) callRPC(ctx context.Context, method string, params interface{}, out interface{}) error {
	const maxRetries = 3
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(attempt) * time.Second
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
		}

		lastErr = c.doRPC(ctx, method, params, out)
		if lastErr == nil {
			return nil
		}

		if !isRateLimitError(lastErr) {
			return lastErr
		}
	}
	return lastErr
}

func isRateLimitError(err error) bool {
	rpcErr, ok := err.(*rpcCallError)
	if ok && rpcErr.code == 429 {
		return true
	}
	msg := err.Error()
	return strings.Contains(msg, "429") || strings.Contains(msg, "rate") || strings.Contains(msg, "throttl")
}

func (c *BaseRPCClient) doRPC(ctx context.Context, method string, params interface{}, out interface{}) error {
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

	var decoded rpcResponse
	if err := json.Unmarshal(body, &decoded); err != nil {
		if resp.StatusCode >= 400 {
			return fmt.Errorf("rpc http status=%d body=%s", resp.StatusCode, string(body))
		}
		return err
	}
	if decoded.Error != nil {
		return &rpcCallError{code: decoded.Error.Code, message: decoded.Error.Message}
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("rpc http status=%d", resp.StatusCode)
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

// --- Helpers ---

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
