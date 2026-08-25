## Why

People with a Microsoft work account need a clear way to use the sample app. The app must also make the result clear and help people recover when sign-in fails.

## What Changes

- Add a Microsoft Entra sign-in choice to the login screen.
- Show a clear success state after sign-in.
- Let a signed-in person sign out and return to the login screen.
- Show a useful next step when sign-in fails.

## Capabilities

### New Capabilities

- `entra-login`: Covers sign-in with a Microsoft work account, the success state, sign-out, and help after a failed sign-in.

### Modified Capabilities

None.

## Impact

The sample app will gain a login flow and a signed-in state. It will rely on Microsoft Entra as an identity service and will need app registration settings for that service.
