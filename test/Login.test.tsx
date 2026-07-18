import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext'; // Adjust the import path as needed
import { LoginPage } from '../src/pages/Login'; // Adjust the import path as needed

describe('LoginPage', () => {
  it('should successfully log in a user with the stub provider', async () => {
    render(
      <Router>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </Router>
    );

    // Select the stub provider
    fireEvent.click(screen.getByText(/Continue with Stub/i));

    // Wait for the login to complete
    // You might need to adjust the waiting mechanism based on your implementation
    // For example, wait for a specific element to appear on the next page
    await screen.findByText(/Welcome/i); // Replace with an element from your post-login page

    // Assert that the user is logged in
    // This could be checking for the presence of a user name, a logout button, etc.
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });
});
