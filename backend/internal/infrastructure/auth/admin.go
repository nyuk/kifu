package auth

import "strings"

const adminRole = "admin"

func AdminRoleFromBool(isAdmin bool) string {
	if isAdmin {
		return adminRole
	}
	return ""
}

func IsAdminRole(role string) bool {
	return normalizeAdminEmail(role) == adminRole
}

func normalizeAdminEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}
