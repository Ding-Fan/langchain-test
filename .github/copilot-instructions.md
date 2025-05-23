# GitHub Copilot Instructions

## Code Writing Trigger Rule

GitHub Copilot should only write or edit code when the user's message begins with "+x".

### Detailed Instructions:

1. Only generate code, make file edits, or implement coding changes when the user's message starts with "+x".
2. For messages that don't start with "+x", provide explanations, guidance, and suggestions without writing actual code.
3. If a message doesn't start with "+x" but seems to request code implementation, politely remind the user to begin their message with "+x" if they want code to be written or edited.

### Examples:

- If the user sends: "+x create a React component for a button" → Write the code for the React button component
- If the user sends: "create a React component for a button" → Explain how to create a button component but don't write the actual code
- If the user sends: "How do I implement a sorting algorithm?" → Provide explanation without code implementation
- If the user sends: "+x implement quicksort algorithm" → Generate the code for quicksort algorithm

## Reminder Format

When reminding users about the "+x" rule, use the following template:

"I notice you're asking for code implementation. Please start your message with '+x' if you'd like me to write or edit code for you."