# Testing Guide for Trivia on Tap

This project uses **Jest** and **React Testing Library** for unit and integration testing.

## Setup Complete ✅

The following testing infrastructure has been set up:

- **Jest** - Test runner and assertion library
- **React Testing Library** - For testing React components
- **Jest Environment JSDOM** - Browser-like environment for tests
- **User Event** - For simulating user interactions

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test GameSummary.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should render"
```

## Test Structure

Tests are located alongside the files they test:

```
src/
├── app/
│   └── dashboard/
│       └── components/
│           ├── GameSummary.js
│           └── GameSummary.test.js
└── utils/
    ├── auth.js
    └── auth.test.js
```

## What's Already Tested

### Components
- **GameSummary** - Complete test suite covering:
  - Basic rendering with different props
  - Modal vs normal mode
  - User interactions (button clicks)
  - Score calculations
  - Edge cases

### Utilities
- **Auth functions** - Complete test suite covering:
  - Login/logout functionality
  - User registration
  - Password reset and update
  - Authentication state checking
  - Error handling

## Mocking Strategy

The setup includes mocks for:

- **Next.js Router** - Both app router and pages router
- **Supabase** - All auth and database operations
- **OpenAI** - API calls for trivia generation
- **Environment variables** - Test-specific values

## Writing New Tests

### Component Tests
```javascript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import YourComponent from './YourComponent'

describe('YourComponent', () => {
  test('renders correctly', () => {
    render(<YourComponent prop="value" />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  test('handles user interaction', async () => {
    const user = userEvent.setup()
    const mockFn = jest.fn()
    
    render(<YourComponent onClick={mockFn} />)
    await user.click(screen.getByRole('button'))
    
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})
```

### Utility Function Tests
```javascript
import { yourFunction } from './yourFile'

describe('yourFunction', () => {
  test('returns expected result', () => {
    const result = yourFunction('input')
    expect(result).toBe('expected output')
  })

  test('handles error cases', () => {
    expect(() => yourFunction(null)).toThrow('Error message')
  })
})
```

## Best Practices

1. **Test user behavior, not implementation details**
2. **Use descriptive test names** - "should display error when login fails"
3. **Mock external dependencies** - Supabase, OpenAI, etc.
4. **Test edge cases** - empty data, error states, loading states
5. **Keep tests simple** - One assertion per test when possible
6. **Use `beforeEach` and `afterEach`** for setup and cleanup

## Global Test Utilities

Available in all tests via `jest.setup.js`:

```javascript
// Mock user data
global.mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' }
}

// Mock game data
global.mockGameData = {
  id: 'test-game-id',
  score: 8,
  total_questions: 10,
  category: 'Science',
  difficulty: 'medium'
}
```

## Coverage Goals

Aim for:
- **80%+ line coverage** for utility functions
- **70%+ line coverage** for components
- **100% coverage** for critical business logic

Run `npm run test:coverage` to see current coverage reports.

## Next Steps

Consider adding:
- **E2E tests** with Playwright or Cypress
- **Visual regression tests** for UI components
- **Performance tests** for game logic
- **Integration tests** for complete user flows 