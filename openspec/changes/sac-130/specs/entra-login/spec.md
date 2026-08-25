## Purpose

This capability lets people enter and leave the sample app with a Microsoft work account and gives clear help when sign-in fails.

## ADDED Requirements

### Requirement: Start sign-in

The app SHALL show a Microsoft Entra sign-in choice on the login screen. When a person selects it, the app SHALL start sign-in for a Microsoft work account.

#### Scenario: Person starts sign-in

- **WHEN** a person selects the Microsoft Entra sign-in choice.
- **THEN** the app starts sign-in for a Microsoft work account.

### Requirement: Show sign-in success

After sign-in succeeds, the app SHALL show a signed-in state that makes the result clear.

#### Scenario: Sign-in succeeds

- **WHEN** Microsoft Entra reports that sign-in has succeeded.
- **THEN** the app shows a clear signed-in state.

### Requirement: Sign out

The app SHALL let a signed-in person sign out. After sign-out, the app SHALL show the login screen and SHALL no longer show the signed-in state.

#### Scenario: Person signs out

- **WHEN** a signed-in person selects sign-out.
- **THEN** the app ends the signed-in state and shows the login screen.

### Requirement: Help after failed sign-in

When sign-in fails, the app SHALL show that it failed and SHALL give the person a clear way to try again.

#### Scenario: Sign-in fails

- **WHEN** Microsoft Entra reports that sign-in has failed.
- **THEN** the app shows the failure and a clear way to try again.
