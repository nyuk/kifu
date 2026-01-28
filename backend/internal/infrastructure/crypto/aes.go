package crypto

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/base64"
    "errors"
    "fmt"
    "io"
    "os"
    "strings"
)

const encryptedValuePrefix = "v1"

func Encrypt(plaintext string, key []byte) (string, error) {
    if len(key) != 32 {
        return "", errors.New("key must be 32 bytes for AES-256")
    }

    block, err := aes.NewCipher(key)
    if err != nil {
        return "", err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }

    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return "", err
    }

    ciphertext := gcm.Seal(nil, nonce, []byte(plaintext), nil)

    return fmt.Sprintf("%s:%s:%s",
        encryptedValuePrefix,
        base64.StdEncoding.EncodeToString(nonce),
        base64.StdEncoding.EncodeToString(ciphertext),
    ), nil
}

func Decrypt(encrypted string, key []byte) (string, error) {
    if len(key) != 32 {
        return "", errors.New("key must be 32 bytes for AES-256")
    }

    parts := strings.Split(encrypted, ":")
    if len(parts) != 3 || parts[0] != encryptedValuePrefix {
        return "", errors.New("invalid encrypted value format")
    }

    nonce, err := base64.StdEncoding.DecodeString(parts[1])
    if err != nil {
        return "", err
    }

    ciphertext, err := base64.StdEncoding.DecodeString(parts[2])
    if err != nil {
        return "", err
    }

    block, err := aes.NewCipher(key)
    if err != nil {
        return "", err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }

    if len(nonce) != gcm.NonceSize() {
        return "", errors.New("invalid nonce size")
    }

    plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
    if err != nil {
        return "", err
    }

    return string(plaintext), nil
}

func LoadKeyFromEnv(envVar string) ([]byte, error) {
    keyB64 := os.Getenv(envVar)
    if keyB64 == "" {
        return nil, errors.New("encryption key not set")
    }

    key, err := base64.StdEncoding.DecodeString(keyB64)
    if err != nil {
        return nil, err
    }

    if len(key) != 32 {
        return nil, errors.New("encryption key must be 32 bytes after base64 decoding")
    }

    return key, nil
}
