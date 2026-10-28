package shared

import "fmt"

type ErrorKind string

const (
	KindInvalid      ErrorKind = "invalid"
	KindNotFound     ErrorKind = "not_found"
	KindUnauthorized ErrorKind = "unauthorized"
	KindForbidden    ErrorKind = "forbidden"
	KindConflict     ErrorKind = "conflict"
	KindTimeout      ErrorKind = "timeout"
	KindUnavailable  ErrorKind = "unavailable"
	KindInternal     ErrorKind = "internal"
)

type Error struct {
	Kind    ErrorKind
	Message string
	Cause   error
}

func (err *Error) Error() string {
	if err == nil {
		return ""
	}
	if err.Cause == nil {
		return err.Message
	}
	if err.Message == "" {
		return err.Cause.Error()
	}
	return fmt.Sprintf("%s: %v", err.Message, err.Cause)
}

func (err *Error) Unwrap() error {
	if err == nil {
		return nil
	}
	return err.Cause
}

func NewError(kind ErrorKind, message string, cause error) *Error {
	return &Error{Kind: kind, Message: message, Cause: cause}
}

func Validation(message string) *Error {
	return NewError(KindInvalid, message, nil)
}
