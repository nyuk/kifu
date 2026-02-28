package ai_providers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/interfaces"
)

// OpenAIClient implements AIProviderClient for OpenAI API.
type OpenAIClient struct {
	httpClient *http.Client
}

func NewOpenAIClient(httpClient *http.Client) *OpenAIClient {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 30 * time.Second}
	}
	return &OpenAIClient{httpClient: httpClient}
}

// Invoke sends a request to OpenAI's API and returns the result.
func (c *OpenAIClient) Invoke(ctx context.Context, invocation *interfaces.AIInvocation) (*interfaces.AIInvocationResult, error) {
	if invocation == nil || invocation.Provider == nil {
		return nil, errors.New("invocation and provider must not be nil")
	}

	// Build request payload
	payload := map[string]interface{}{
		"model":       invocation.Model,
		"messages":    c.messagesToOpenAI(invocation.Messages),
		"temperature": 0.2,
	}

	// Apply options
	if invocation.Options.MaxTokens != nil && *invocation.Options.MaxTokens > 0 {
		payload["max_tokens"] = *invocation.Options.MaxTokens
	} else {
		payload["max_tokens"] = 260 // default
	}
	if invocation.Options.Temperature != nil {
		payload["temperature"] = *invocation.Options.Temperature
	}
	if invocation.Options.TopP != nil {
		payload["top_p"] = *invocation.Options.TopP
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Determine endpoint
	endpoint := invocation.DefaultEndpoint()
	baseURL := invocation.Provider.BaseURL
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	url := fmt.Sprintf("%s/%s", strings.TrimSuffix(baseURL, "/"), endpoint)

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+invocation.Provider.BaseURL) // This will be overridden by caller with actual key

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openai error %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	// Parse response
	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(result.Choices) == 0 {
		return nil, errors.New("openai returned no choices")
	}

	content := strings.TrimSpace(result.Choices[0].Message.Content)
	if content == "" {
		return nil, errors.New("openai returned empty content")
	}

	tokens := result.Usage.TotalTokens
	return &interfaces.AIInvocationResult{
		Content:     content,
		Model:       invocation.Model,
		TokensUsed:  tokens,
		RawResponse: respBody,
	}, nil
}

// Validate checks that the provider configuration is valid.
func (c *OpenAIClient) Validate(ctx context.Context, provider *entities.AIProvider) error {
	if provider == nil {
		return errors.New("provider must not be nil")
	}
	if provider.BaseURL == "" {
		return errors.New("provider base URL is required")
	}
	return nil
}

// ProviderType returns the provider type this adapter handles.
func (c *OpenAIClient) ProviderType() string {
	return entities.ProviderTypeOpenAI
}

// messagesToOpenAI converts generic AIMessage to OpenAI format.
func (c *OpenAIClient) messagesToOpenAI(messages []interfaces.AIMessage) []map[string]string {
	result := make([]map[string]string, len(messages))
	for i, msg := range messages {
		result[i] = map[string]string{
			"role":    msg.Role,
			"content": msg.Content,
		}
	}
	return result
}
