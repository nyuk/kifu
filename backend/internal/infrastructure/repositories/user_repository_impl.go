package repositories

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type UserRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) repositories.UserRepository {
	return &UserRepositoryImpl{pool: pool}
}

func (r *UserRepositoryImpl) Create(ctx context.Context, user *entities.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, name, ai_allowlisted, is_admin, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.pool.Exec(ctx, query,
		user.ID, user.Email, user.PasswordHash, user.Name, user.AIAllowlisted, user.IsAdmin, user.CreatedAt, user.UpdatedAt)
	return err
}

func (r *UserRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.User, error) {
	query := `
		SELECT id, email, password_hash, name, ai_allowlisted, is_admin, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var user entities.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.AIAllowlisted, &user.IsAdmin, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepositoryImpl) GetByEmail(ctx context.Context, email string) (*entities.User, error) {
	query := `
		SELECT id, email, password_hash, name, ai_allowlisted, is_admin, created_at, updated_at
		FROM users
		WHERE LOWER(email) = LOWER($1)
	`
	var user entities.User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.AIAllowlisted, &user.IsAdmin, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepositoryImpl) ListForAdmin(ctx context.Context, limit int, offset int, search string) ([]*entities.User, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}
	if offset < 0 {
		offset = 0
	}

	needle := strings.TrimSpace(strings.ToLower(search))
	baseQuery := `
		SELECT id, email, password_hash, name, ai_allowlisted, is_admin, created_at, updated_at
		FROM users
	`
	var rows pgx.Rows
	var err error

	if needle == "" {
		query := baseQuery + `
			ORDER BY created_at DESC
			LIMIT $1 OFFSET $2
		`
		rows, err = r.pool.Query(ctx, query, limit, offset)
	} else {
		query := baseQuery + `
			WHERE lower(email) LIKE $1 OR lower(name) LIKE $1
			ORDER BY created_at DESC
			LIMIT $2 OFFSET $3
		`
		param := "%" + needle + "%"
		rows, err = r.pool.Query(ctx, query, param, limit, offset)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]*entities.User, 0, limit)
	for rows.Next() {
		var user entities.User
		if err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.PasswordHash,
			&user.Name,
			&user.AIAllowlisted,
			&user.IsAdmin,
			&user.CreatedAt,
			&user.UpdatedAt,
		); err != nil {
			return nil, err
		}
		users = append(users, &user)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

func (r *UserRepositoryImpl) CountForAdmin(ctx context.Context, search string) (int, error) {
	needle := strings.TrimSpace(strings.ToLower(search))
	var count int

	if needle == "" {
		query := `
			SELECT COUNT(*)
			FROM users
		`
		if err := r.pool.QueryRow(ctx, query).Scan(&count); err != nil {
			return 0, err
		}
		return count, nil
	}

	query := `
		SELECT COUNT(*)
		FROM users
		WHERE lower(email) LIKE $1 OR lower(name) LIKE $1
	`
	param := "%" + needle + "%"
	if err := r.pool.QueryRow(ctx, query, param).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (r *UserRepositoryImpl) SetAdmin(ctx context.Context, id uuid.UUID, isAdmin bool) error {
	query := `
		UPDATE users
		SET is_admin = $2, updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id, isAdmin)
	return err
}

func (r *UserRepositoryImpl) Update(ctx context.Context, user *entities.User) error {
	query := `
		UPDATE users
		SET email = $2, password_hash = $3, name = $4, ai_allowlisted = $5, is_admin = $6, updated_at = $7
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		user.ID, user.Email, user.PasswordHash, user.Name, user.AIAllowlisted, user.IsAdmin, user.UpdatedAt)
	return err
}

func (r *UserRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}
