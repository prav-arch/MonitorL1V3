/**
 * Main Layout component for the application.
 * Provides a consistent layout with navigation for all pages.
 */
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container, Nav, Navbar, Button } from 'react-bootstrap';
import Image from 'next/image';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * MainLayout component for wrapping page content with a consistent layout including navigation
 * 
 * @param children The page content to be wrapped
 * @returns The layout component with navigation and content
 */
export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();

  // Helper function to determine if a link is active
  const isActive = (path: string) => {
    return pathname === path ? 'active' : '';
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="dark" variant="dark" expand="lg" className="border-bottom border-secondary">
        <Container fluid>
          <Navbar.Brand as={Link} href="/" className="d-flex align-items-center">
            <Image
              src="/generated-icon.png"
              alt="L1 Monitoring"
              width={36}
              height={36}
              className="me-2"
            />
            <span>Telecom L1 Monitoring</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="navbar-nav" />
          <Navbar.Collapse id="navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link 
                as={Link} 
                href="/" 
                className={`px-3 ${isActive('/')}`}
              >
                Dashboard
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                href="/telecom-health" 
                className={`px-3 ${isActive('/telecom-health')}`}
              >
                Telecom Health
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                href="/ai-assistant" 
                className={`px-3 ${isActive('/ai-assistant')}`}
              >
                AI Assistant
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                href="/fine-tuning" 
                className={`px-3 ${isActive('/fine-tuning')}`}
              >
                Fine Tuning
              </Nav.Link>
            </Nav>
            <div className="ms-3 d-flex align-items-center">
              <Button 
                variant="outline-info" 
                size="sm"
                as="a"
                href="https://github.com/username/telecom-l1-monitoring" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <i className="bi bi-github me-1"></i> GitHub
              </Button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="flex-grow-1 py-4">
        <Container fluid>
          {children}
        </Container>
      </main>

      <footer className="bg-dark text-light py-3 border-top border-secondary">
        <Container fluid className="text-center">
          <small>&copy; {new Date().getFullYear()} Telecom L1 Monitoring - All rights reserved</small>
        </Container>
      </footer>
    </div>
  );
}