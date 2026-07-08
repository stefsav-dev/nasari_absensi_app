package services

import (
	"context"
	"fmt"
	"log"
	"path/filepath"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

var FCMClient *messaging.Client

func InitFirebase() error {
	ctx := context.Background()

	// Use the correct path to the provided service account key
	// In production, you might want to use an environment variable for the path
	serviceAccountKeyPath := filepath.Join("keys", "nasari-absensi-firebase-adminsdk-fbsvc-c91d994bdf.json")

	opt := option.WithCredentialsFile(serviceAccountKeyPath)
	
	// Create the firebase app
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return fmt.Errorf("error initializing firebase app: %v", err)
	}

	// Get the messaging client
	client, err := app.Messaging(ctx)
	if err != nil {
		return fmt.Errorf("error getting messaging client: %v", err)
	}

	FCMClient = client
	log.Println("Firebase Admin SDK initialized successfully")
	return nil
}

// SendPushNotification sends a push notification to a specific token
func SendPushNotification(token, title, body string) error {
	if FCMClient == nil {
		return fmt.Errorf("FCM Client is not initialized")
	}

	if token == "" {
		return fmt.Errorf("FCM token is empty")
	}

	message := &messaging.Message{
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Token: token,
	}

	response, err := FCMClient.Send(context.Background(), message)
	if err != nil {
		return err
	}

	log.Printf("Successfully sent message: %v\n", response)
	return nil
}
