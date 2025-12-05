# RezervacnyWeb

Semestralka/Bakalarka, rezervačná webová aplikácia určená pre malé fitness centrá so skupinovými tréningami.

## Features

- **Responsive Layout**: External CSS with mobile-first responsive design
- **Admin Panel**: Secure admin-only access for user management
- **Full CRUD Operations**: Create, Read, Update, Delete users
- **Form Validation**: Both client-side and server-side validation
- **Dynamic Filtering**: Real-time search and filter functionality
- **Modal Editing**: Interactive modal dialogs for user management

## Requirements

- Node.js 14.x or higher
- npm 6.x or higher

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Jergus512/RezervacnyWeb.git
cd RezervacnyWeb
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Demo Credentials

- **Admin**: username: `admin`, password: `admin123`
- **User**: username: `john_doe`, password: `password123`

## Project Structure

```
RezervacnyWeb/
├── app.js                 # Main application entry point
├── package.json           # Node.js dependencies
├── public/
│   ├── css/
│   │   └── styles.css     # External CSS with responsive design
│   └── js/
│       └── admin.js       # Client-side JavaScript for admin panel
└── views/
    ├── admin/
    │   └── dashboard.ejs  # Admin panel view
    ├── partials/
    │   ├── alerts.ejs     # Flash messages
    │   ├── footer.ejs     # Page footer
    │   ├── header.ejs     # Page header
    │   └── navbar.ejs     # Navigation bar
    ├── index.ejs          # Home page
    └── login.ejs          # Login page
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: EJS templates, Vanilla JavaScript
- **Styling**: Custom CSS with responsive design
- **Authentication**: Express-session with bcrypt password hashing

