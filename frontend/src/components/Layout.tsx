import { Link } from 'react-router-dom';
import { PropsWithChildren } from 'react';

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="vh-100 d-flex flex-column">
      <header className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm">
        <div className="container-fluid">
          <Link to="/" className="navbar-brand d-flex align-items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="d-inline-block align-text-top me-2"
            >
              <path d="M14 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              <path d="M18 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              <path d="M6 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              <path d="M14 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              <path d="M6 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              <path d="m6 13-2 4" />
              <path d="m14 9-2 4" />
              <path d="m18 13-2-4" />
              <path d="m14 5-2-4" />
              <path d="m10 5-2 4" />
            </svg>
            <span className="fs-4 fw-bold">Silsilah</span>
          </Link>
        </div>
      </header>
      <main className="container-fluid py-4 flex-grow-1">{children}</main>
    </div>
  );
}
