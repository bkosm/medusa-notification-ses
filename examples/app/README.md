# `medusa-notification-ses` example app

Created with the `npx create-medusa-app` wizard.

## Package resolution

This example resolves the Medusa provider via links, so it is not present in the `package.json`. 

To run the example first do

```sh
yarn link
```
in the root of the repository, then


```sh
yarn link @bkosm/medusa-notification-ses
```

in the example directory (where this README lives).

## AWS auth

This app expects to have keys exported in the system environment to send out SES sandbox emails.

```bash
export AWS_REGION=eu-central-1
export AWS_ACCESS_KEY_ID="ASIAV..."
export AWS_SECRET_ACCESS_KEY="nejJi80p..."
export AWS_SESSION_TOKEN="IQoJb3JpZ2l..."
```

## Flow showcase

### Customer updated

Whenever a customer is updated, a raw text email is sent with a csv file attachment. Sends the email to the customer directly.

### Product updated

Whenever a product is updated, a templated email is sent. Requires `ADMIN_EMAIL` env to be set to determine who to send the email to.
