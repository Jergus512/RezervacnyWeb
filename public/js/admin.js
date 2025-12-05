/**
 * Admin Panel JavaScript
 * Handles CRUD operations, dynamic filtering, modal editing, and client-side validation
 */

// DOM Elements
const userTableBody = document.getElementById('userTableBody');
const searchInput = document.getElementById('searchInput');
const roleFilter = document.getElementById('roleFilter');
const addUserBtn = document.getElementById('addUserBtn');
const userModal = document.getElementById('userModal');
const deleteModal = document.getElementById('deleteModal');
const userForm = document.getElementById('userForm');
const modalTitle = document.getElementById('modalTitle');
const toastContainer = document.getElementById('toastContainer');

// State
let users = [];
let editingUserId = null;
let deleteUserId = null;
let debounceTimer = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setupEventListeners();
    updateStats();
});

// Event Listeners
function setupEventListeners() {
    // Search with debounce
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            loadUsers();
        }, 300);
    });

    // Role filter
    roleFilter.addEventListener('change', loadUsers);

    // Add user button
    addUserBtn.addEventListener('click', () => openModal());

    // Form submission
    userForm.addEventListener('submit', handleFormSubmit);

    // Close modal buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(userModal);
            closeModal(deleteModal);
        });
    });

    // Close modal on overlay click
    [userModal, deleteModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal(userModal);
            closeModal(deleteModal);
        }
    });

    // Delete confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // Real-time validation
    document.querySelectorAll('#userForm input, #userForm select').forEach(input => {
        input.addEventListener('input', () => validateField(input));
        input.addEventListener('blur', () => validateField(input));
    });
}

// API Functions
async function loadUsers() {
    try {
        const search = searchInput.value;
        const role = roleFilter.value;
        
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (role) params.append('role', role);
        
        const response = await fetch(`/api/users?${params}`);
        if (!response.ok) throw new Error('Failed to load users');
        
        users = await response.json();
        renderUsers();
        updateStats();
    } catch (error) {
        showToast('Failed to load users', 'error');
        console.error(error);
    }
}

async function createUser(userData) {
    const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.errors ? data.errors.join(', ') : data.error);
    }
    
    return data;
}

async function updateUser(id, userData) {
    const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.errors ? data.errors.join(', ') : data.error);
    }
    
    return data;
}

async function deleteUser(id) {
    const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error);
    }
    
    return data;
}

// Render Functions
function renderUsers() {
    if (users.length === 0) {
        userTableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">👤</div>
                        <p>No users found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    userTableBody.innerHTML = users.map(user => `
        <tr data-user-id="${user.id}">
            <td>
                <strong>${escapeHtml(user.username)}</strong>
            </td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <span class="badge badge-${user.role}">${user.role}</span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td class="actions">
                <button class="btn btn-primary btn-sm" onclick="editUser(${user.id})" title="Edit user">
                    ✏️ Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${user.id})" title="Delete user">
                    🗑️ Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    const totalUsers = users.length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.filter(u => u.role === 'user').length;
    
    const totalUsersEl = document.getElementById('totalUsers');
    const adminCountEl = document.getElementById('adminCount');
    const userCountEl = document.getElementById('userCount');
    
    if (totalUsersEl) totalUsersEl.textContent = totalUsers;
    if (adminCountEl) adminCountEl.textContent = adminCount;
    if (userCountEl) userCountEl.textContent = userCount;
}

// Modal Functions
function openModal(user = null) {
    editingUserId = user ? user.id : null;
    modalTitle.textContent = user ? 'Edit User' : 'Add New User';
    
    // Reset form
    userForm.reset();
    clearValidation();
    
    // Fill form if editing
    if (user) {
        document.getElementById('username').value = user.username;
        document.getElementById('email').value = user.email;
        document.getElementById('role').value = user.role;
        document.getElementById('password').placeholder = 'Leave blank to keep current password';
        document.getElementById('password').required = false;
    } else {
        document.getElementById('password').placeholder = 'Enter password';
        document.getElementById('password').required = true;
    }
    
    userModal.classList.add('show');
    document.getElementById('username').focus();
}

function closeModal(modal) {
    modal.classList.remove('show');
    if (modal === userModal) {
        editingUserId = null;
        userForm.reset();
        clearValidation();
    }
    if (modal === deleteModal) {
        deleteUserId = null;
    }
}

function editUser(id) {
    const user = users.find(u => u.id === id);
    if (user) {
        openModal(user);
    }
}

function openDeleteModal(id) {
    deleteUserId = id;
    const user = users.find(u => u.id === id);
    if (user) {
        document.getElementById('deleteUserName').textContent = user.username;
        deleteModal.classList.add('show');
    }
}

// Form Handling
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const formData = {
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        role: document.getElementById('role').value
    };
    
    const submitBtn = userForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
    submitBtn.disabled = true;
    
    try {
        if (editingUserId) {
            await updateUser(editingUserId, formData);
            showToast('User updated successfully', 'success');
        } else {
            await createUser(formData);
            showToast('User created successfully', 'success');
        }
        
        closeModal(userModal);
        loadUsers();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function confirmDelete() {
    if (!deleteUserId) return;
    
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<span class="spinner"></span> Deleting...';
    deleteBtn.disabled = true;
    
    try {
        await deleteUser(deleteUserId);
        showToast('User deleted successfully', 'success');
        closeModal(deleteModal);
        loadUsers();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    }
}

// Client-side Validation
function validateForm() {
    let isValid = true;
    
    const fields = ['username', 'email', 'password', 'role'];
    fields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (!validateField(input)) {
            isValid = false;
        }
    });
    
    return isValid;
}

function validateField(input) {
    const value = input.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Clear previous validation
    input.classList.remove('is-valid', 'is-invalid');
    const feedback = input.parentElement.querySelector('.invalid-feedback');
    if (feedback) feedback.textContent = '';
    
    switch (input.id) {
        case 'username':
            if (value.length < 3) {
                isValid = false;
                errorMessage = 'Username must be at least 3 characters long';
            } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                isValid = false;
                errorMessage = 'Username can only contain letters, numbers, and underscores';
            }
            break;
            
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
            break;
            
        case 'password':
            // Skip validation if editing and password is empty
            if (editingUserId && value.length === 0) {
                return true;
            }
            if (value.length < 6) {
                isValid = false;
                errorMessage = 'Password must be at least 6 characters long';
            } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
                isValid = false;
                errorMessage = 'Password must contain lowercase, uppercase, and number';
            }
            break;
            
        case 'role':
            if (!['admin', 'user'].includes(value)) {
                isValid = false;
                errorMessage = 'Please select a valid role';
            }
            break;
    }
    
    if (isValid && value.length > 0) {
        input.classList.add('is-valid');
    } else if (!isValid) {
        input.classList.add('is-invalid');
        if (feedback) feedback.textContent = errorMessage;
    }
    
    return isValid;
}

function clearValidation() {
    document.querySelectorAll('.form-control').forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
    });
    document.querySelectorAll('.invalid-feedback').forEach(feedback => {
        feedback.textContent = '';
    });
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Make functions available globally
window.editUser = editUser;
window.openDeleteModal = openDeleteModal;
