package handlers

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

const (
	aiReviewNoteTitle     = "AI 복기 요약"
	defaultAINoteKeepMax  = 200
	aiReviewNoteKeepEnv   = "AI_REVIEW_NOTES_KEEP"
)

type NoteHandler struct {
	noteRepo repositories.ReviewNoteRepository
}

func NewNoteHandler(noteRepo repositories.ReviewNoteRepository) *NoteHandler {
	return &NoteHandler{noteRepo: noteRepo}
}

type CreateNoteRequest struct {
	BubbleID      *string  `json:"bubble_id,omitempty"`
	Title         string   `json:"title"`
	Content       string   `json:"content"`
	Tags          []string `json:"tags,omitempty"`
	LessonLearned string   `json:"lesson_learned,omitempty"`
	Emotion       string   `json:"emotion,omitempty"`
}

type UpdateNoteRequest struct {
	BubbleID      *string  `json:"bubble_id,omitempty"`
	Title         string   `json:"title"`
	Content       string   `json:"content"`
	Tags          []string `json:"tags,omitempty"`
	LessonLearned string   `json:"lesson_learned,omitempty"`
	Emotion       string   `json:"emotion,omitempty"`
}

type NoteResponse struct {
	ID            string   `json:"id"`
	BubbleID      *string  `json:"bubble_id,omitempty"`
	Title         string   `json:"title"`
	Content       string   `json:"content"`
	Tags          []string `json:"tags,omitempty"`
	LessonLearned string   `json:"lesson_learned,omitempty"`
	Emotion       string   `json:"emotion,omitempty"`
	CreatedAt     string   `json:"created_at"`
	UpdatedAt     string   `json:"updated_at"`
}

type NotesListResponse struct {
	Notes      []NoteResponse `json:"notes"`
	Total      int            `json:"total"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	TotalPages int            `json:"total_pages"`
}

func noteToResponse(note *entities.ReviewNote) NoteResponse {
	resp := NoteResponse{
		ID:            note.ID.String(),
		Title:         note.Title,
		Content:       note.Content,
		Tags:          note.Tags,
		LessonLearned: note.LessonLearned,
		Emotion:       string(note.Emotion),
		CreatedAt:     note.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:     note.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if note.BubbleID != nil {
		bubbleStr := note.BubbleID.String()
		resp.BubbleID = &bubbleStr
	}
	return resp
}

// CreateNote creates a new review note
func (h *NoteHandler) CreateNote(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req CreateNoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Title == "" || req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title and content are required"})
	}

	note := &entities.ReviewNote{
		UserID:        userID,
		Title:         req.Title,
		Content:       req.Content,
		Tags:          req.Tags,
		LessonLearned: req.LessonLearned,
		Emotion:       entities.Emotion(req.Emotion),
	}

	if req.BubbleID != nil && *req.BubbleID != "" {
		bubbleUUID, err := uuid.Parse(*req.BubbleID)
		if err == nil {
			note.BubbleID = &bubbleUUID
		}
	}

	if err := h.noteRepo.Create(c.Context(), note); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if shouldPruneAINote(req.Title) {
		keep := resolveAINoteKeepMax()
		if err := h.noteRepo.PruneAIGeneratedByUser(c.Context(), userID, keep); err != nil {
			log.Printf("note prune failed: user=%s keep=%d err=%v", userID.String(), keep, err)
		}
	}

	return c.Status(fiber.StatusCreated).JSON(noteToResponse(note))
}

// UpdateNote updates an existing review note
func (h *NoteHandler) UpdateNote(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	noteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid note id"})
	}

	var req UpdateNoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	note, err := h.noteRepo.GetByID(c.Context(), noteID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "note not found"})
	}

	note.Title = req.Title
	note.Content = req.Content
	note.Tags = req.Tags
	note.LessonLearned = req.LessonLearned
	note.Emotion = entities.Emotion(req.Emotion)

	if req.BubbleID != nil && *req.BubbleID != "" {
		bubbleUUID, err := uuid.Parse(*req.BubbleID)
		if err == nil {
			note.BubbleID = &bubbleUUID
		}
	} else {
		note.BubbleID = nil
	}

	if err := h.noteRepo.Update(c.Context(), note); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(noteToResponse(note))
}

// DeleteNote deletes a review note
func (h *NoteHandler) DeleteNote(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	noteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid note id"})
	}

	if err := h.noteRepo.Delete(c.Context(), noteID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusNoContent).Send(nil)
}

// GetNote returns a single note
func (h *NoteHandler) GetNote(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	noteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid note id"})
	}

	note, err := h.noteRepo.GetByID(c.Context(), noteID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "note not found"})
	}

	return c.JSON(noteToResponse(note))
}

// ListNotes returns paginated list of notes
func (h *NoteHandler) ListNotes(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	notes, total, err := h.noteRepo.ListByUser(c.Context(), userID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	noteResponses := make([]NoteResponse, 0, len(notes))
	for _, note := range notes {
		noteResponses = append(noteResponses, noteToResponse(note))
	}

	totalPages := (total + limit - 1) / limit

	return c.JSON(NotesListResponse{
		Notes:      noteResponses,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	})
}

// ListNotesByBubble returns notes for a specific bubble
func (h *NoteHandler) ListNotesByBubble(c *fiber.Ctx) error {
	bubbleID, err := uuid.Parse(c.Params("bubbleId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid bubble id"})
	}

	notes, err := h.noteRepo.ListByBubble(c.Context(), bubbleID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	noteResponses := make([]NoteResponse, 0, len(notes))
	for _, note := range notes {
		noteResponses = append(noteResponses, noteToResponse(note))
	}

	return c.JSON(fiber.Map{"notes": noteResponses})
}

func shouldPruneAINote(title string) bool {
	return strings.TrimSpace(title) == aiReviewNoteTitle
}

func resolveAINoteKeepMax() int {
	raw := strings.TrimSpace(os.Getenv(aiReviewNoteKeepEnv))
	if raw == "" {
		return defaultAINoteKeepMax
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 {
		return defaultAINoteKeepMax
	}
	if value > 2000 {
		return 2000
	}
	return value
}
