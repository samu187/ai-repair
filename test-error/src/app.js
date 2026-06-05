export function getWelcomeMessage(user) {
  return `Welcome back, ${user.profile.name.toUpperCase()}!`;
}

export function simulateButtonPress() {
  const currentUser = {
    id: "user_123",
    email: "sam@example.com"
  };

  return getWelcomeMessage(currentUser);
}
