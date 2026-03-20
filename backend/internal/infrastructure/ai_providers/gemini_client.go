package ai_providers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/interfaces"
)

// GeminiClient implements AIProviderClient for Google's Gemini API.
type GeminiClient struct {
	httpClient *http.Client
}

func NewGeminiClient(httpClient *http.Client) *GeminiClient {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 30 * time.Second}
	}
	return &GeminiClient{httpClient: httpClient}
}

// Invoke sends a request to Gemini's API and returns the result.
func (c *GeminiClient) Invoke(ctx context.Context, invocation *interfaces.AIInvocation) (*interfaces.AIInvocationResult, error) {
	if invocation == nil || invocation.Provider == nil {
		return nil, errors.New("invocation and provider must not be nil")
	}
	if strings.TrimSpace(invocation.Credential) == "" {
		return nil, errors.New("provider credential is required")
	}

	// Build request payload
	payload := map[string]interface{}{
		"contents": c.messagesToGemini(invocation.Messages),
		"generationConfig": map[string]interface{}{
			"temperature":     0.2,
			"maxOutputTokens": 260,
			"thinkingConfig": map[string]interface{}{
				"thinkingBudget": 0,
			},
		},
	}

	// Apply options
	if invocation.Options.MaxTokens != nil && *invocation.Options.MaxTokens > 0 {
		payload["generationConfig"].(map[string]interface{})["maxOutputTokens"] = *invocation.Options.MaxTokens
	}
	if invocation.Options.Temperature != nil {
		payload["generationConfig"].(map[string]interface{})["temperature"] = *invocation.Options.Temperature
	}
	if invocation.Options.TopP != nil {
		payload["generationConfig"].(map[string]interface{})["topP"] = *invocation.Options.TopP
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Determine endpoint - Gemini uses model in URL
	endpoint := invocation.DefaultEndpoint()
	baseURL := invocation.Provider.BaseURL
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com/v1beta"
	}

	endpointURL := fmt.Sprintf(
		"%s/models/%s:%s?key=%s",
		strings.TrimSuffix(baseURL, "/"),
		invocation.Model,
		endpoint,
		url.QueryEscape(invocation.Credential),
	)

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpointURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

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
		return nil, fmt.Errorf("gemini error %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	// Parse response
	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		UsageMetadata struct {
			TotalTokenCount int `json:"totalTokenCount"`
		} `json:"usageMetadata"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return nil, errors.New("gemini returned no content")
	}

	var textParts []string
	for _, part := range result.Candidates[0].Content.Parts {
		if trimmed := strings.TrimSpace(part.Text); trimmed != "" {
			textParts = append(textParts, trimmed)
		}
	}
	content := strings.TrimSpace(strings.Join(textParts, "\n"))
	if content == "" {
		return nil, errors.New("gemini returned empty content")
	}

	tokens := result.UsageMetadata.TotalTokenCount
	if tokens == 0 {
		// If token count is 0, return nil for tokens (optional field)
		return &interfaces.AIInvocationResult{
			Content:     content,
			Model:       invocation.Model,
			TokensUsed:  0,
			RawResponse: respBody,
		}, nil
	}

	return &interfaces.AIInvocationResult{
		Content:     content,
		Model:       invocation.Model,
		TokensUsed:  tokens,
		RawResponse: respBody,
	}, nil
}

// Validate checks that the provider configuration is valid.
func (c *GeminiClient) Validate(ctx context.Context, provider *entities.AIProvider) error {
	if provider == nil {
		return errors.New("provider must not be nil")
	}
	if provider.BaseURL == "" {
		return errors.New("provider base URL is required")
	}
	return nil
}

// ProviderType returns the provider type this adapter handles.
func (c *GeminiClient) ProviderType() string {
	return entities.ProviderTypeGoogle
}

// messagesToGemini converts generic AIMessage to Gemini format.
func (c *GeminiClient) messagesToGemini(messages []interfaces.AIMessage) []map[string]interface{} {
	result := make([]map[string]interface{}, len(messages))
	for i, msg := range messages {
		result[i] = map[string]interface{}{
			"role": msg.Role,
			"parts": []map[string]string{
				{"text": msg.Content},
			},
		}
	}
	return result
}
