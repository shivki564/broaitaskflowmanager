/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { initializeDatabase, seedInitialData, onSnapshot, setDoc, deleteDoc } from './lib/database';
import { LoginScreen } from './components/LoginScreen';
import {
    LayoutDashboard,
    FolderGit2,
    CheckSquare,
    Users,
    Plus,
    Search,
    Filter,
    Calendar,
    AlertTriangle,
    MessageSquare,
    X,
    Edit2,
    Trash2,
    UserCheck,
    UserX,
    TrendingUp,
    User,
    Shield,
    Activity,
    CheckCircle2,
    AlertCircle,
    Clock,
    ExternalLink,
    Lock,
    ArrowLeft,
    Kanban,
    Columns3,
    Layers
} from 'lucide-react';

import { DatePicker } from './components/DatePicker';

// ==========================================
// TYPES DECLARATIONS
// ==========================================

interface TeamMember {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: 'Admin' | 'Team Member';
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface Project {
    id: string;
    name: string;
    description: string;
    owner_id: string; // User ID
    created_at: string;
}

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'TO_DO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
    project_id: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    end_date: string; // YYYY-MM-DD
    assigned_to: string; // User ID
    created_by: string; // User ID
    created_at: string;
    updated_at: string;
}

interface TaskComment {
    id: string;
    task_id: string;
    comment_text: string;
    commented_by: string; // User ID
    created_at: string;
}

// ==========================================
// SEED SECTIONS / LOCAL STORAGE HELPERS
// ==========================================

const INITIAL_USERS: TeamMember[] = [
    {
        id: "u1",
        first_name: "Alex",
        last_name: "Robinson",
        email: "alex@broai.com",
        role: "Admin",
        is_active: true,
        created_at: "2026-01-10T09:00:00Z",
        updated_at: "2026-01-10T09:00:00Z"
    },
    {
        id: "u2",
        first_name: "Jordan",
        last_name: "Smith",
        email: "jordan@broai.com",
        role: "Team Member",
        is_active: true,
        created_at: "2026-02-15T10:30:00Z",
        updated_at: "2026-02-15T10:30:00Z"
    },
    {
        id: "u3",
        first_name: "Maria",
        last_name: "Gomez",
        email: "maria@broai.com",
        role: "Team Member",
        is_active: true,
        created_at: "2026-03-01T11:00:00Z",
        updated_at: "2026-03-01T11:00:00Z"
    },
    {
        id: "u4",
        first_name: "Sam",
        last_name: "Taylor",
        email: "sam@broai.com",
        role: "Team Member",
        is_active: true,
        created_at: "2026-03-20T14:00:00Z",
        updated_at: "2026-03-20T14:00:00Z"
    },
    {
        id: "u5",
        first_name: "Jessica",
        last_name: "Chen",
        email: "jessica@broai.com",
        role: "Team Member",
        is_active: false,
        created_at: "2026-04-05T16:20:00Z",
        updated_at: "2026-04-05T16:20:00Z"
    }
];

const INITIAL_PROJECTS: Project[] = [
    {
        id: "p1",
        name: "Project Nebula",
        description: "Next-gen distributed cloud platform scaling infrastructure seamlessly.",
        owner_id: "u1",
        created_at: "2026-01-15T08:00:00Z"
    },
    {
        id: "p2",
        name: "API V3 Core",
        description: "Rebuilding our core microservices endpoints for faster payloads.",
        owner_id: "u4",
        created_at: "2026-03-10T08:00:00Z"
    }
];

const INITIAL_TASKS: Task[] = [
    {
        id: "t1",
        title: "OAuth2 Implementation",
        description: "Integrate fully secure OAuth2 and JWT flow for third-party client integrations and secure SSO access.",
        status: "IN_PROGRESS",
        project_id: "p1",
        priority: "CRITICAL",
        end_date: "2026-07-05",
        assigned_to: "u2",
        created_by: "u1",
        created_at: "2026-06-15T10:00:00Z",
        updated_at: "2026-06-20T11:30:00Z"
    },
    {
        id: "t2",
        title: "PostgreSQL Index Optimization",
        description: "Identify slow querying workloads, add composite indexes, and optimize query analyzer performance under peak loads.",
        status: "BLOCKED",
        project_id: "p1",
        priority: "HIGH",
        end_date: "2026-06-20", // Overdue in late June 2026
        assigned_to: "u3",
        created_by: "u1",
        created_at: "2026-06-10T09:00:00Z",
        updated_at: "2026-06-22T14:00:00Z"
    },
    {
        id: "t3",
        title: "UI Layout Refactoring",
        description: "Convert old navigation views into highly sleek, modern CSS layouts with beautiful glassmorphism.",
        status: "DONE",
        project_id: "p1",
        priority: "MEDIUM",
        end_date: "2026-06-23",
        assigned_to: "u4",
        created_by: "u1",
        created_at: "2026-06-18T10:00:00Z",
        updated_at: "2026-06-23T17:00:00Z"
    },
    {
        id: "t4",
        title: "User Documentation Wiki",
        description: "Draft official developer wiki and end-user onboarding documentation for Project Nebula launch.",
        status: "TO_DO",
        project_id: "p1",
        priority: "LOW",
        end_date: "2026-07-15",
        assigned_to: "u1",
        created_by: "u1",
        created_at: "2026-06-20T08:00:00Z",
        updated_at: "2026-06-20T08:00:00Z"
    },
    {
        id: "t5",
        title: "Setup API Gateway Routing",
        description: "Establish automated reverse-proxy configurations, load-balancers, and path-based API gateway routing tables.",
        status: "TO_DO",
        project_id: "p2",
        priority: "HIGH",
        end_date: "2026-07-12",
        assigned_to: "u2",
        created_by: "u4",
        created_at: "2026-06-21T09:00:00Z",
        updated_at: "2026-06-21T09:00:00Z"
    },
    {
        id: "t6",
        title: "Implement JWT Authentication",
        description: "Build robust stateless JSON Web Token session validation middleware with asymmetric signature keys.",
        status: "DONE",
        project_id: "p2",
        priority: "CRITICAL",
        end_date: "2026-06-24",
        assigned_to: "u4",
        created_by: "u4",
        created_at: "2026-06-19T11:00:00Z",
        updated_at: "2026-06-24T12:00:00Z"
    }
];

const INITIAL_COMMENTS: TaskComment[] = [
    {
        id: "c1",
        task_id: "t1",
        comment_text: "Standardizing on OAuth2 authorization code flow with PKCE for security.",
        commented_by: "u2",
        created_at: "2026-06-21T14:30:00Z"
    },
    {
        id: "c2",
        task_id: "t2",
        comment_text: "Blocked on disk quota expansion and admin database level execution grants.",
        commented_by: "u3",
        created_at: "2026-06-22T15:20:00Z"
    },
    {
        id: "c3",
        task_id: "t2",
        comment_text: "I am reviewing the storage requests today. Hang tight, Maria.",
        commented_by: "u1",
        created_at: "2026-06-23T09:10:00Z"
    }
];

// Helper to format today's local date as YYYY-MM-DD
const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function App() {
    // ==========================================
    // STATE DEFINITIONS
    // ==========================================

    // Primary Database State synced from LocalStorage
    const [users, setUsers] = useState<TeamMember[]>(() => {
        const data = localStorage.getItem('btf_users');
        return data ? JSON.parse(data) : INITIAL_USERS;
    });

    const [projects, setProjects] = useState<Project[]>(() => {
        const data = localStorage.getItem('btf_projects');
        return data ? JSON.parse(data) : INITIAL_PROJECTS;
    });

    const [tasks, setTasks] = useState<Task[]>(() => {
        const data = localStorage.getItem('btf_tasks');
        return data ? JSON.parse(data) : INITIAL_TASKS;
    });

    const [comments, setComments] = useState<TaskComment[]>(() => {
        const data = localStorage.getItem('btf_comments');
        return data ? JSON.parse(data) : INITIAL_COMMENTS;
    });

    // Login state - user must be authenticated to access the app
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
        const token = localStorage.getItem('btf_auth_token');
        return !!token;
    });

    // Database ready state - ensure DB is initialized before allowing login
    const [isDatabaseReady, setIsDatabaseReady] = useState(false);

    // Current session active user (Simulated login state)
    // Initially logged in as Alex Robinson (Admin)
    const [currentUser, setCurrentUser] = useState<TeamMember>(() => {
        const stored = localStorage.getItem('btf_current_user');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                // fallback
            }
        }
        return INITIAL_USERS[0]; // Alex (Admin)
    });

    // Active Menu View State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'tasks' | 'team'>('dashboard');

    // Search and Filter States for Tasks Tab
    const [taskSearch, setTaskSearch] = useState('');
    const [taskStatusFilter, setTaskStatusFilter] = useState<string>('ALL');
    const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('ALL');
    const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>('ALL');
    const [taskProjectFilter, setTaskProjectFilter] = useState<string>('ALL');
    const [taskOverdueOnly, setTaskOverdueOnly] = useState(false);

    // Dedicated Project Kanban Board State
    const [selectedKanbanProjectId, setSelectedKanbanProjectId] = useState<string | null>(null);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    // Selected Task for detailed view modal/drawer
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [taskDraft, setTaskDraft] = useState<Task | null>(null);

    // Sync draft state with the actual task when selected taskId changes or tasks change from outside
    useEffect(() => {
        if (selectedTaskId) {
            const taskObj = tasks.find(t => t.id === selectedTaskId);
            if (taskObj) {
                setTaskDraft({ ...taskObj });
            } else {
                setTaskDraft(null);
            }
        } else {
            setTaskDraft(null);
        }
    }, [selectedTaskId, tasks]);

    // Modals visibility states
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
    const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);

    // Deletion confirmation states
    const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
    const [commentToDelete, setCommentToDelete] = useState<TaskComment | null>(null);
    const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);

    // New Form Fields states
    const [newTaskForm, setNewTaskForm] = useState({
        title: '',
        description: '',
        status: 'TO_DO' as Task['status'],
        project_id: '',
        priority: 'MEDIUM' as Task['priority'],
        end_date: getTodayStr(),
        assigned_to: ''
    });

    const [newProjectForm, setNewProjectForm] = useState({
        name: '',
        description: '',
        owner_id: ''
    });

    const [newUserForm, setNewUserForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        role: 'Team Member' as TeamMember['role'],
        is_active: true
    });

    // State for search in Team tab
    const [teamSearch, setTeamSearch] = useState('');

    // Edit User Form (separate copy)
    const [editUserForm, setEditUserForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        role: 'Team Member' as TeamMember['role'],
        is_active: true
    });

    // Custom Comment field state inside Task details drawer
    const [newCommentText, setNewCommentText] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState('');

    // Notification Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // ==========================================
    // SYNC TO SQLite & LOCAL STORAGE
    // ==========================================
    useEffect(() => {
        let active = true;
        let unsubUsers: (() => void) | null = null;
        let unsubProjects: (() => void) | null = null;
        let unsubTasks: (() => void) | null = null;
        let unsubComments: (() => void) | null = null;

        async function initAndSync() {
            try {
                // 1. Initialize SQLite database
                await initializeDatabase();

                // 2. Seed initial data to SQLite if empty
                await seedInitialData(INITIAL_USERS, INITIAL_PROJECTS, INITIAL_TASKS, INITIAL_COMMENTS);

                // 3. Mark database as ready for login/auth operations
                setIsDatabaseReady(true);
            } catch (err) {
                console.warn("SQLite initialization or seeding failed:", err);
                setIsDatabaseReady(true); // Still mark as ready even if seeding fails
            }

            if (!active) return;

            // 3. Real-time SQLite sync using onSnapshot listeners
            try {
                unsubUsers = onSnapshot('users', (uList: TeamMember[]) => {
                    if (uList.length === 0) {
                        // Keep local/initial users if database is currently empty
                        return;
                    }
                    uList.sort((a, b) => a.id.localeCompare(b.id));
                    setUsers(uList);
                });

                unsubProjects = onSnapshot('projects', (pList: Project[]) => {
                    if (pList.length === 0) {
                        // Keep local/initial projects if database is currently empty
                        return;
                    }
                    pList.sort((a, b) => a.created_at.localeCompare(b.created_at));
                    setProjects(pList);
                });

                unsubTasks = onSnapshot('tasks', (tList: Task[]) => {
                    if (tList.length === 0) {
                        // Keep local/initial tasks if database is currently empty
                        return;
                    }
                    tList.sort((a, b) => b.created_at.localeCompare(a.created_at)); // newest first
                    setTasks(tList);
                });

                unsubComments = onSnapshot('comments', (cList: TaskComment[]) => {
                    if (cList.length === 0) {
                        // Keep local/initial comments if database is currently empty
                        return;
                    }
                    cList.sort((a, b) => a.created_at.localeCompare(b.created_at));
                    setComments(cList);
                });
            } catch (err) {
                console.error("Failed to initialize SQLite real-time subscriptions:", err);
            }
        }

        initAndSync();

        return () => {
            active = false;
            if (unsubUsers) unsubUsers();
            if (unsubProjects) unsubProjects();
            if (unsubTasks) unsubTasks();
            if (unsubComments) unsubComments();
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('btf_users', JSON.stringify(users));
    }, [users]);

    useEffect(() => {
        localStorage.setItem('btf_projects', JSON.stringify(projects));
    }, [projects]);

    useEffect(() => {
        localStorage.setItem('btf_tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        localStorage.setItem('btf_comments', JSON.stringify(comments));
    }, [comments]);

    useEffect(() => {
        localStorage.setItem('btf_current_user', JSON.stringify(currentUser));
    }, [currentUser]);

    // Sync currentUser with fresh data from users state
    useEffect(() => {
        const freshUser = users.find(u => u.id === currentUser.id);
        if (freshUser) {
            if (
                freshUser.first_name !== currentUser.first_name ||
                freshUser.last_name !== currentUser.last_name ||
                freshUser.email !== currentUser.email ||
                freshUser.role !== currentUser.role ||
                freshUser.is_active !== currentUser.is_active
            ) {
                setCurrentUser(freshUser);
            }
        }
    }, [users, currentUser.id]);

    // Toast auto-dismissal
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Helper to show toasts
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
    };

    // Current local date (YYYY-MM-DD) for defaults and overdue check
    const TODAY_STR = getTodayStr();

    // Overdue Check helper
    const isTaskOverdue = (task: Task) => {
        if (task.status === 'DONE') return false;
        if (!task.end_date) return false;
        return task.end_date < TODAY_STR;
    };



    // ==========================================
    // DASHBOARD MATH / ANALYTICS
    // ==========================================
    const dashboardStats = useMemo(() => {
        const total = tasks.length;
        const open = tasks.filter(t => t.status === 'TO_DO').length;
        const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
        const blocked = tasks.filter(t => t.status === 'BLOCKED').length;
        const completed = tasks.filter(t => t.status === 'DONE').length;
        const overdue = tasks.filter(t => isTaskOverdue(t)).length;

        // Completion percentage
        const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Tasks By Status mapping
        const statusCounts = {
            TO_DO: open,
            IN_PROGRESS: inProgress,
            BLOCKED: blocked,
            DONE: completed
        };

        // Tasks By Employee mapping (Active users only)
        const assigneeCounts: { [userName: string]: number } = {};
        users.forEach(u => {
            const uName = `${u.first_name} ${u.last_name}`;
            assigneeCounts[uName] = tasks.filter(t => t.assigned_to === u.id).length;
        });

        return {
            total,
            open,
            inProgress,
            blocked,
            completed,
            overdue,
            completionPercentage,
            statusCounts,
            assigneeCounts
        };
    }, [tasks, users]);

    // ==========================================
    // TASKS FILTERS COMPUTATION
    // ==========================================
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // 1. Title/Description search
            const matchesSearch =
                task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
                task.description.toLowerCase().includes(taskSearch.toLowerCase());

            // 2. Status
            const matchesStatus = taskStatusFilter === 'ALL' || task.status === taskStatusFilter;

            // 3. Priority
            const matchesPriority = taskPriorityFilter === 'ALL' || task.priority === taskPriorityFilter;

            // 4. Assignee
            const matchesAssignee = taskAssigneeFilter === 'ALL' || task.assigned_to === taskAssigneeFilter;

            // 5. Project
            const matchesProject = taskProjectFilter === 'ALL' || task.project_id === taskProjectFilter;

            // 6. Overdue
            const matchesOverdue = !taskOverdueOnly || isTaskOverdue(task);

            return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesProject && matchesOverdue;
        });
    }, [tasks, taskSearch, taskStatusFilter, taskPriorityFilter, taskAssigneeFilter, taskProjectFilter, taskOverdueOnly]);

    // Get active selected task detail object
    const selectedTask = useMemo(() => {
        if (!selectedTaskId) return null;
        return tasks.find(t => t.id === selectedTaskId) || null;
    }, [tasks, selectedTaskId]);

    // Comments specifically for the selected task
    const selectedTaskComments = useMemo(() => {
        if (!selectedTaskId) return [];
        return comments
            .filter(c => c.task_id === selectedTaskId)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }, [comments, selectedTaskId]);

    // ==========================================
    // HANDLERS: USER MANAGEMENT
    // ==========================================
    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        // Only Admin can create users
        if (currentUser.role !== 'Admin') {
            showToast("Access Denied: Only Administrators can create team members.", "error");
            return;
        }

        if (!newUserForm.first_name.trim() || !newUserForm.last_name.trim() || !newUserForm.email.trim()) {
            showToast("Please fill in all user profile fields.", "error");
            return;
        }

        const emailExists = users.some(u => u.email.toLowerCase() === newUserForm.email.trim().toLowerCase());
        if (emailExists) {
            showToast("Email already registered in system.", "error");
            return;
        }

        // Close modal immediately for better UX
        setIsCreateUserModalOpen(false);
        setActiveTab('team');

        const newUser: TeamMember = {
            id: `u_${Date.now()}`,
            first_name: newUserForm.first_name.trim(),
            last_name: newUserForm.last_name.trim(),
            email: newUserForm.email.trim(),
            role: newUserForm.role,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Optimistically update local users state
        setUsers(prev => [...prev, newUser]);

        setDoc('users', newUser.id, newUser)
            .then(() => {
                showToast(`Successfully registered ${newUser.first_name} ${newUser.last_name}!`, "success");
            })
            .catch((err) => {
                console.error(err);
                showToast("Error registering user to database.", "error");
                // Revert optimistic update
                setUsers(prev => prev.filter(u => u.id !== newUser.id));
            });

        // Reset form
        setNewUserForm({
            first_name: '',
            last_name: '',
            email: '',
            role: 'Team Member',
            is_active: true
        });
    };

    const handleEditUserClick = (user: TeamMember) => {
        if (currentUser.role !== 'Admin') {
            showToast("Access Denied: Only Administrators can edit team members.", "error");
            return;
        }
        setEditingUserId(user.id);
        setEditUserForm({
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role,
            is_active: user.is_active
        });
    };

    const handleUpdateUser = (e?: React.SyntheticEvent) => {
        e?.preventDefault();
        if (currentUser.role !== 'Admin' || !editingUserId) {
            showToast("Access Denied: Only Administrators can edit team members.", "error");
            return;
        }

        if (!editUserForm.first_name.trim() || !editUserForm.last_name.trim() || !editUserForm.email.trim()) {
            showToast("Please fill in all user fields.", "error");
            return;
        }

        const emailExists = users.some(u => u.id !== editingUserId && u.email.toLowerCase() === editUserForm.email.trim().toLowerCase());
        if (emailExists) {
            showToast("Email already exists.", "error");
            return;
        }

        const targetUser = users.find(u => u.id === editingUserId);
        if (!targetUser) return;

        if (editingUserId === currentUser.id && !editUserForm.is_active) {
            showToast("Warning: You cannot deactivate your own active session.", "error");
            return;
        }

        const updatedUser: TeamMember = {
            ...targetUser,
            first_name: editUserForm.first_name.trim(),
            last_name: editUserForm.last_name.trim(),
            email: editUserForm.email.trim(),
            role: editUserForm.role,
            is_active: editUserForm.is_active,
            updated_at: new Date().toISOString()
        };

        // Store previous state for reversion
        const previousUsers = [...users];

        // Optimistically update local users state
        setUsers(prev => prev.map(u => u.id === editingUserId ? updatedUser : u));

        setDoc('users', editingUserId, updatedUser)
            .then(() => {
                showToast("Team member updated successfully in database.", "success");
                if (editingUserId === currentUser.id) {
                    setCurrentUser(updatedUser);
                }
            })
            .catch((err) => {
                console.error(err);
                showToast("Error updating team member in database.", "error");
                // Revert optimistic update
                setUsers(previousUsers);
            });

        setEditingUserId(null);
    };

    const toggleUserActiveState = (userId: string) => {
        if (currentUser.role !== 'Admin') {
            showToast("Access Denied: Only Administrators can deactivate team members.", "error");
            return;
        }

        if (userId === currentUser.id) {
            showToast("Cannot deactivate your own active admin session.", "error");
            return;
        }

        const targetUser = users.find(u => u.id === userId);
        if (!targetUser) return;

        const nextState = !targetUser.is_active;
        const updatedUser: TeamMember = {
            ...targetUser,
            is_active: nextState,
            updated_at: new Date().toISOString()
        };

        // Store previous state for reversion
        const previousUsers = [...users];

        // Optimistically update local users state
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));

        setDoc('users', userId, updatedUser)
            .then(() => {
                showToast(`${targetUser.first_name} is now ${nextState ? 'Active' : 'Deactivated'}.`, "info");
            })
            .catch((err) => {
                console.error(err);
                showToast("Error updating active state in database.", "error");
                // Revert optimistic update
                setUsers(previousUsers);
            });
    };

    const handleDeleteUser = (userId: string) => {
        if (currentUser.role !== 'Admin') {
            showToast("Access Denied: Only Administrators can delete team members.", "error");
            return;
        }

        if (userId === currentUser.id) {
            showToast("Cannot delete your own active admin session.", "error");
            return;
        }

        setUserToDeleteId(userId);
    };

    const confirmDeleteUser = async () => {
        if (!userToDeleteId) return;

        // Store previous state for reversion
        const previousUsers = [...users];

        // Optimistically update local users state
        setUsers(prev => prev.filter(u => u.id !== userToDeleteId));

        try {
            await deleteDoc('users', userToDeleteId);
            showToast("Team member deleted successfully from database.", "success");
            console.log('User deleted successfully:', userToDeleteId);
        } catch (err) {
            console.error('Delete user error:', err);
            showToast("Error deleting team member from database.", "error");
            // Revert optimistic update
            setUsers(previousUsers);
        } finally {
            setUserToDeleteId(null);
        }
    };

    // ==========================================
    // HANDLERS: PROJECT MANAGEMENT
    // ==========================================
    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectForm.name.trim()) {
            showToast("Project Name is required.", "error");
            return;
        }

        // Close modal immediately for better UX
        setIsCreateProjectModalOpen(false);
        setActiveTab('projects');

        if (editingProjectId) {
            const targetProj = projects.find(p => p.id === editingProjectId);
            if (!targetProj) return;
            const updatedProj: Project = {
                ...targetProj,
                name: newProjectForm.name.trim(),
                description: newProjectForm.description.trim() || "No description provided.",
                owner_id: newProjectForm.owner_id || currentUser.id
            };

            const previousProjects = [...projects];
            // Optimistically update project list locally
            setProjects(prev => prev.map(p => p.id === editingProjectId ? updatedProj : p));

            setDoc('projects', editingProjectId, updatedProj)
                .then(() => {
                    showToast(`Project details updated successfully!`, "success");
                })
                .catch((err) => {
                    console.error("Firestore update project error:", err);
                    showToast("Project details updated locally.", "info");
                });
        } else {
            const newProject: Project = {
                id: `p_${Date.now()}`,
                name: newProjectForm.name.trim(),
                description: newProjectForm.description.trim() || "No description provided.",
                owner_id: newProjectForm.owner_id || currentUser.id,
                created_at: new Date().toISOString()
            };

            const previousProjects = [...projects];
            // Optimistically update project list locally
            setProjects(prev => [...prev, newProject]);

            setDoc('projects', newProject.id, newProject)
                .then(() => {
                    showToast(`Project "${newProject.name}" created successfully!`, "success");
                })
                .catch((err) => {
                    console.error("Firestore create project error:", err);
                    showToast("Project created locally.", "info");
                });
        }

        setEditingProjectId(null);
        setNewProjectForm({ name: '', description: '', owner_id: '' });
    };

    const handleEditProjectClick = (proj: Project) => {
        setEditingProjectId(proj.id);
        setNewProjectForm({
            name: proj.name,
            description: proj.description,
            owner_id: proj.owner_id
        });
        setIsCreateProjectModalOpen(true);
    };

    const handleDeleteProjectClick = (projectId: string) => {
        setProjectToDeleteId(projectId);
    };

    const confirmDeleteProject = async () => {
        if (!projectToDeleteId) return;

        const previousProjects = [...projects];
        const previousTasks = [...tasks];
        const previousComments = [...comments];

        const tasksOfProject = tasks.filter(t => t.project_id === projectToDeleteId);
        const taskIdsOfProject = new Set(tasksOfProject.map(t => t.id));
        const commentsToDelete = comments.filter(c => taskIdsOfProject.has(c.task_id));

        // Optimistically delete project and associated tasks/comments locally
        setProjects(prev => prev.filter(p => p.id !== projectToDeleteId));
        setTasks(prev => prev.filter(t => t.project_id !== projectToDeleteId));
        setComments(prev => prev.filter(c => !taskIdsOfProject.has(c.task_id)));

        // Deselect if active task was in the deleted project
        if (selectedTaskId && taskIdsOfProject.has(selectedTaskId)) {
            setSelectedTaskId(null);
        }

        try {
            // 1. Delete project document
            await deleteDoc('projects', projectToDeleteId);

            // 2. Delete tasks
            for (const t of tasksOfProject) {
                await deleteDoc('tasks', t.id);
            }

            // 3. Delete comments
            for (const c of commentsToDelete) {
                await deleteDoc('comments', c.id);
            }

            showToast("Project domain and all associated tasks successfully deleted.", "success");
        } catch (e) {
            console.error("Firestore project deletion error:", e);
            showToast("Deleted locally (offline fallback).", "info");
        }

        setProjectToDeleteId(null);
    };

    // ==========================================
    // HANDLERS: TASK MANAGEMENT
    // ==========================================
    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskForm.title.trim()) {
            showToast("Task title is required.", "error");
            return;
        }
        if (!newTaskForm.project_id) {
            showToast("Please assign this task to a project.", "error");
            return;
        }
        if (!newTaskForm.assigned_to) {
            showToast("Please choose an assignee.", "error");
            return;
        }

        // Close modal immediately for better UX
        setIsCreateTaskModalOpen(false);
        setActiveTab('tasks');

        const newTask: Task = {
            id: `t_${Date.now()}`,
            title: newTaskForm.title.trim(),
            description: newTaskForm.description.trim() || "No description provided.",
            status: newTaskForm.status,
            project_id: newTaskForm.project_id,
            priority: newTaskForm.priority,
            end_date: newTaskForm.end_date || TODAY_STR,
            assigned_to: newTaskForm.assigned_to,
            created_by: currentUser.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Optimistically update the tasks state immediately
        setTasks(prev => [newTask, ...prev]);

        setDoc('tasks', newTask.id, newTask)
            .then(() => {
                showToast(`Task "${newTask.title}" added successfully!`, "success");
            })
            .catch((err) => {
                console.error("Firestore task creation error:", err);
                showToast("Task saved locally (offline mode).", "info");
            });

        // Reset task form
        setNewTaskForm({
            title: '',
            description: '',
            status: 'TO_DO',
            project_id: projects[0]?.id || '',
            priority: 'MEDIUM',
            end_date: TODAY_STR,
            assigned_to: users[0]?.id || ''
        });
    };

    const handleUpdateDraftField = (field: keyof Task, value: any) => {
        setTaskDraft(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [field]: value
            };
        });
    };

    const handleSaveTaskDetails = () => {
        if (!taskDraft) return;
        const updatedTask = {
            ...taskDraft,
            updated_at: new Date().toISOString()
        };

        // Optimistically update tasks state locally
        setTasks(prev => prev.map(t => t.id === taskDraft.id ? updatedTask : t));

        setDoc('tasks', taskDraft.id, updatedTask)
            .then(() => {
                showToast("Task details saved successfully.", "success");
            })
            .catch((err) => {
                console.error("Firestore save task details error:", err);
                showToast("Saved locally (offline fallback).", "info");
            });
    };

    const handleUpdateTaskField = (taskId: string, field: keyof Task, value: any) => {
        const targetTask = tasks.find(t => t.id === taskId);
        if (!targetTask) return;
        const updatedTask = {
            ...targetTask,
            [field]: value,
            updated_at: new Date().toISOString()
        };

        // Optimistically update tasks state locally
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

        setDoc('tasks', taskId, updatedTask)
            .then(() => {
                showToast("Task details synchronized.", "info");
            })
            .catch((err) => {
                console.error("Firestore update task field error:", err);
                showToast("Updated locally.", "info");
            });
    };

    const handleDeleteTask = (taskId: string) => {
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (!taskToDelete) return;

        // Check custom permissions if needed, but allow for better simulated user testing experience
        if (currentUser.role !== 'Admin' && taskToDelete.created_by !== currentUser.id) {
            showToast("Access Denied: Only Administrators or Task Creators can delete tasks.", "error");
            return;
        }

        setTaskToDeleteId(taskId);
    };

    const confirmDeleteTask = async () => {
        if (!taskToDeleteId) return;

        const previousTasks = [...tasks];
        const previousComments = [...comments];

        const taskComments = comments.filter(c => c.task_id === taskToDeleteId);

        // Optimistically delete locally
        setTasks(prev => prev.filter(t => t.id !== taskToDeleteId));
        setComments(prev => prev.filter(c => c.task_id !== taskToDeleteId));

        try {
            // Cascade delete comments
            for (const c of taskComments) {
                await deleteDoc('comments', c.id);
            }

            await deleteDoc('tasks', taskToDeleteId);
            showToast("Task deleted successfully.", "success");
        } catch (e) {
            console.error("Firestore delete task error:", e);
            showToast("Deleted locally (offline fallback).", "info");
        }
        setSelectedTaskId(null);
        setTaskToDeleteId(null);
    };

    // ==========================================
    // HANDLERS: COMMENTS MANAGEMENT
    // ==========================================
    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTaskId) return;
        if (!newCommentText.trim()) return;

        const newComment: TaskComment = {
            id: `c_${Date.now()}`,
            task_id: selectedTaskId,
            comment_text: newCommentText.trim(),
            commented_by: currentUser.id,
            created_at: new Date().toISOString()
        };

        const previousComments = [...comments];
        // Optimistically update comment list locally
        setComments(prev => [...prev, newComment]);

        setDoc('comments', newComment.id, newComment)
            .then(() => {
                showToast("Comment recorded.", "success");
            })
            .catch((err) => {
                console.error("Firestore comment creation error:", err);
                showToast("Comment saved locally (offline mode).", "info");
            });
        setNewCommentText('');
    };

    const handleStartEditComment = (comment: TaskComment) => {
        if (comment.commented_by !== currentUser.id) {
            showToast("You can only edit comments you wrote.", "error");
            return;
        }
        setEditingCommentId(comment.id);
        setEditCommentText(comment.comment_text);
    };

    const handleSaveEditComment = (commentId: string) => {
        if (!editCommentText.trim()) return;

        const targetComment = comments.find(c => c.id === commentId);
        if (!targetComment) return;

        const updatedComment = {
            ...targetComment,
            comment_text: editCommentText.trim()
        };

        const previousComments = [...comments];
        // Optimistically update comment list locally
        setComments(prev => prev.map(c => c.id === commentId ? updatedComment : c));

        setDoc('comments', commentId, updatedComment)
            .then(() => {
                showToast("Comment updated.", "success");
            })
            .catch((err) => {
                console.error("Firestore comment edit error:", err);
                showToast("Comment updated locally.", "info");
            });
        setEditingCommentId(null);
    };

    const handleDeleteComment = (comment: TaskComment) => {
        if (comment.commented_by !== currentUser.id && currentUser.role !== 'Admin') {
            showToast("Permission denied: You can only delete your own comments.", "error");
            return;
        }

        setCommentToDelete(comment);
    };

    const confirmDeleteComment = () => {
        if (!commentToDelete) return;

        const previousComments = [...comments];
        // Optimistically remove comment locally
        setComments(prev => prev.filter(c => c.id !== commentToDelete.id));

        deleteDoc('comments', commentToDelete.id)
            .then(() => {
                showToast("Comment removed.", "success");
            })
            .catch((err) => {
                console.error("Firestore delete comment error:", err);
                showToast("Comment removed locally.", "info");
            });
        setCommentToDelete(null);
    };

    // ==========================================
    // VIEW RENDER HELPERS
    // ==========================================
    const getProjectName = (projectId: string) => {
        const proj = projects.find(p => p.id === projectId);
        return proj ? proj.name : "Unknown Project";
    };

    const getUserName = (userId: string) => {
        const usr = users.find(u => u.id === userId);
        return usr ? `${usr.first_name} ${usr.last_name}` : "Unassigned";
    };

    const getUserInitials = (userId: string) => {
        const usr = users.find(u => u.id === userId);
        if (!usr) return "??";
        return `${usr.first_name[0] || ''}${usr.last_name[0] || ''}`.toUpperCase();
    };

    // Open task creator helper populated with correct defaults
    const openTaskCreator = () => {
        setNewTaskForm({
            title: '',
            description: '',
            status: 'TO_DO',
            project_id: projects[0]?.id || '',
            priority: 'MEDIUM',
            end_date: TODAY_STR,
            assigned_to: users.filter(u => u.is_active)[0]?.id || currentUser.id
        });
        setIsCreateTaskModalOpen(true);
    };

    // Handle login
    const handleLogin = (user: TeamMember, token: string) => {
        setCurrentUser(user);
        localStorage.setItem('btf_current_user', JSON.stringify(user));
        localStorage.setItem('btf_auth_token', token);
        setIsLoggedIn(true);
    };

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem('btf_auth_token');
        localStorage.removeItem('btf_current_user');
        setIsLoggedIn(false);
    };

    // Show loading screen while database initializes
    if (!isDatabaseReady) {
        return (
            <div className="flex items-center justify-center w-full h-screen bg-gradient-to-b from-slate-900 to-slate-800">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Initializing database...</p>
                </div>
            </div>
        );
    }

    // Show login screen if not logged in
    if (!isLoggedIn) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div id="app_root" className="flex min-h-screen bg-[#020617] text-slate-100 font-sans overflow-x-hidden relative">
            {/* Background Mesh Gradient Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[130px] pointer-events-none"></div>

            {/* GLOBAL TOAST NOTIFICATION */}
            {toast && (
                <div id="toast_notification" className="fixed top-5 right-5 z-50 flex items-center gap-3 p-4 rounded-xl border backdrop-blur-lg shadow-xl animate-fade-in transition-all bg-slate-900/90 border-white/10 text-white max-w-sm">
                    {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                    {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                    {toast.type === 'info' && <Clock className="w-5 h-5 text-cyan-400 shrink-0" />}
                    <p className="text-xs font-medium">{toast.message}</p>
                </div>
            )}

            {/* ==========================================
          SIDEBAR
          ========================================== */}
            <aside id="app_sidebar" className="w-68 flex flex-col border-r border-white/10 bg-white/5 backdrop-blur-xl z-20 shrink-0 sticky top-0 h-screen">
                <div className="p-6 flex items-center gap-3 border-b border-white/5">
                    <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/20 text-base">B</div>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-extrabold tracking-wider uppercase text-white">BrovAI Task Flow</h1>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none"></span>
                    </div>
                </div>


                {/* Side Nav Links */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 px-2">Workspace Navigation</div>

                    <button
                        id="nav_dashboard"
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-xs font-medium ${activeTab === 'dashboard'
                            ? 'bg-indigo-600/20 text-white border-l-4 border-indigo-500 font-semibold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <LayoutDashboard className="w-4 h-4 shrink-0" />
                        <span>Dashboard</span>
                    </button>

                    <button
                        id="nav_projects"
                        onClick={() => setActiveTab('projects')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-xs font-medium ${activeTab === 'projects'
                            ? 'bg-indigo-600/20 text-white border-l-4 border-indigo-500 font-semibold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <FolderGit2 className="w-4 h-4 shrink-0" />
                        <span>Projects ({projects.length})</span>
                    </button>

                    <button
                        id="nav_tasks"
                        onClick={() => setActiveTab('tasks')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-xs font-medium ${activeTab === 'tasks'
                            ? 'bg-indigo-600/20 text-white border-l-4 border-indigo-500 font-semibold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <CheckSquare className="w-4 h-4 shrink-0" />
                        <span>Tasks ({tasks.length})</span>
                    </button>

                    <button
                        id="nav_team"
                        onClick={() => setActiveTab('team')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-xs font-medium ${activeTab === 'team'
                            ? 'bg-indigo-600/20 text-white border-l-4 border-indigo-500 font-semibold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <Users className="w-4 h-4 shrink-0" />
                        <span>Team Management</span>
                    </button>

                    <div className="pt-6 text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 px-2">Project Scopes</div>
                    <div id="sidebar_pinned_projects" className="space-y-1">
                        {projects.map((proj, idx) => (
                            <button
                                key={proj.id}
                                onClick={() => {
                                    setTaskProjectFilter(proj.id);
                                    setActiveTab('tasks');
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs transition-colors text-left truncate"
                            >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${idx % 2 === 0 ? 'bg-indigo-500' : 'bg-cyan-500'}`}></span>
                                <span className="truncate">{proj.name}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Current Active Persona Info Footer */}
                <div id="sidebar_footer_profile" className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white font-bold flex items-center justify-center text-xs shadow-md">
                            {getUserInitials(currentUser.id)}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-bold text-white truncate leading-tight">{currentUser.first_name} {currentUser.last_name}</span>
                            <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1">
                                {currentUser.role === 'Admin' ? 'Admin Role' : 'Team Member'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full py-2 px-3 text-xs font-bold uppercase tracking-wider text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* ==========================================
          MAIN CONTAINER
          ========================================== */}
            <main id="app_main_content" className="flex-1 flex flex-col p-8 z-10 relative overflow-y-auto">

                {/* HEADER */}
                <header id="main_header" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">
                            <span>BrovAI Task Flow</span>
                            <span>/</span>
                            <span className="text-indigo-400 font-bold">
                                {activeTab === 'projects' && selectedKanbanProjectId
                                    ? `Projects / ${getProjectName(selectedKanbanProjectId)} / Kanban`
                                    : activeTab}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-white capitalize">
                            {activeTab === 'dashboard' && 'Team Flow Overview'}
                            {activeTab === 'projects' && (selectedKanbanProjectId ? 'Project Kanban Board' : 'Startup Projects')}
                            {activeTab === 'tasks' && 'Central Task Stream'}
                            {activeTab === 'team' && 'Team Core Registry'}
                        </h2>
                        <p className="text-xs text-slate-400">
                            {activeTab === 'dashboard' && 'Real-time metrics and project velocity analytics.'}
                            {activeTab === 'projects' && (selectedKanbanProjectId ? 'Interactive task stages flow with real-time SQLite sync.' : 'Configure team scopes, owners, and active work domains.')}
                            {activeTab === 'tasks' && `Create and manage tasks`}
                            {activeTab === 'team' && 'Manage core access control list and team rosters.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5 items-center">
                        {/* Quick Action triggers based on Tab */}
                        <button
                            id="header_btn_project"
                            onClick={() => setIsCreateProjectModalOpen(true)}
                            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md cursor-pointer"
                        >
                            + Create Project
                        </button>

                        {currentUser.role === 'Admin' && (
                            <button
                                id="header_btn_user"
                                onClick={() => {
                                    setNewUserForm({ first_name: '', last_name: '', email: '', role: 'Team Member', is_active: true });
                                    setIsCreateUserModalOpen(true);
                                }}
                                className="px-4 py-2 bg-cyan-600/30 border border-cyan-500/30 hover:bg-cyan-600/40 text-cyan-200 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md cursor-pointer"
                            >
                                + Register User
                            </button>
                        )}

                        <button
                            id="header_btn_task"
                            onClick={openTaskCreator}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Task</span>
                        </button>
                    </div>
                </header>

                {/* ==========================================================
            TAB VIEW: DASHBOARD
            ========================================================== */}
                {activeTab === 'dashboard' && (
                    <div id="view_dashboard" className="space-y-8 animate-fade-in">
                        {/* STATS TILES GRID */}
                        <section id="dashboard_stats" className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                            <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Scopes</div>
                                <div className="text-3xl font-extrabold text-white">{dashboardStats.total}</div>
                                <div className="text-[10px] mt-1 text-slate-500 font-semibold">Consolidated tasks</div>
                            </div>

                            <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">To Do</div>
                                <div className="text-3xl font-extrabold text-slate-300">{dashboardStats.open}</div>
                                <div className="text-[10px] mt-1 text-slate-500 font-semibold">Awaiting takeoff</div>
                            </div>

                            <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">In Progress</div>
                                <div className="text-3xl font-extrabold text-indigo-400">{dashboardStats.inProgress}</div>
                                <div className="text-[10px] mt-1 text-indigo-300/40 font-semibold">Active production</div>
                            </div>

                            <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Blocked</div>
                                <div className="text-3xl font-extrabold text-rose-500">{dashboardStats.blocked}</div>
                                <div className="text-[10px] mt-1 text-rose-400/50 font-semibold">Blockers identified</div>
                            </div>

                            <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Overdue</div>
                                <div className="text-3xl font-extrabold text-amber-500">{dashboardStats.overdue}</div>
                                <div className="text-[10px] mt-1 text-amber-400 font-bold uppercase tracking-wider">Critical risk</div>
                            </div>

                            <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all bg-emerald-500/5 border-emerald-500/20">
                                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Done</div>
                                <div className="text-3xl font-extrabold text-emerald-400">{dashboardStats.completed}</div>
                                <div className="text-[10px] mt-1 text-emerald-500/60 font-semibold">Velocity approved</div>
                            </div>
                        </section>

                        {/* SECONDARY ROW: ANALYTICS VISUALIZATIONS */}
                        <div id="dashboard_analytics_grid" className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Workload distribution by Employee
              <div className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Workload distribution</span>
                </h3>
                <div className="space-y-4 max-h-52 overflow-y-auto pr-1">
                  {users.filter(u => u.is_active).map((u) => {
                    const count = dashboardStats.assigneeCounts[`${u.first_name} ${u.last_name}`] || 0;
                    const pct = dashboardStats.total > 0 ? Math.round((count / dashboardStats.total) * 100) : 0;
                    return (
                      <div key={u.id} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-300">{u.first_name} {u.last_name}</span>
                          <span className="text-slate-400 font-bold text-[11px]">{count} tasks ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.3)] transition-all" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div> */}

                            {/* Status Split bar chart */}
                            <div className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Status Velocity</span>
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                                            <span>TO DO</span>
                                            <span className="text-slate-300">{dashboardStats.open} Tasks</span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-950 rounded-lg overflow-hidden border border-white/5">
                                            <div className="h-full bg-slate-500" style={{ width: `${dashboardStats.total > 0 ? (dashboardStats.open / dashboardStats.total) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                                            <span>IN PROGRESS</span>
                                            <span className="text-indigo-400">{dashboardStats.inProgress} Tasks</span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-950 rounded-lg overflow-hidden border border-white/5">
                                            <div className="h-full bg-indigo-500" style={{ width: `${dashboardStats.total > 0 ? (dashboardStats.inProgress / dashboardStats.total) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                                            <span>BLOCKED</span>
                                            <span className="text-rose-400">{dashboardStats.blocked} Tasks</span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-950 rounded-lg overflow-hidden border border-white/5">
                                            <div className="h-full bg-rose-500" style={{ width: `${dashboardStats.total > 0 ? (dashboardStats.blocked / dashboardStats.total) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                                            <span>DONE DEPLOYED</span>
                                            <span className="text-emerald-400">{dashboardStats.completed} Tasks</span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-950 rounded-lg overflow-hidden border border-white/5">
                                            <div className="h-full bg-emerald-500" style={{ width: `${dashboardStats.total > 0 ? (dashboardStats.completed / dashboardStats.total) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Workload by Priority */}
                            <div className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Workload by Priority</span>
                                </h3>

                                <div className="space-y-4">
                                    {[
                                        {
                                            label: 'Critical',
                                            key: 'CRITICAL',
                                            color: 'bg-rose-500',
                                            shadow: 'shadow-[0_0_8px_rgba(244,63,94,0.4)]',
                                            text: 'text-rose-400'
                                        },
                                        {
                                            label: 'High',
                                            key: 'HIGH',
                                            color: 'bg-orange-500',
                                            shadow: 'shadow-[0_0_8px_rgba(249,115,22,0.4)]',
                                            text: 'text-orange-400'
                                        },
                                        {
                                            label: 'Medium',
                                            key: 'MEDIUM',
                                            color: 'bg-amber-500',
                                            shadow: 'shadow-[0_0_8px_rgba(245,158,11,0.4)]',
                                            text: 'text-amber-400'
                                        },
                                        {
                                            label: 'Low',
                                            key: 'LOW',
                                            color: 'bg-slate-500',
                                            shadow: '',
                                            text: 'text-slate-400'
                                        },
                                    ].map(({ label, key, color, shadow, text }) => {

                                        const count = tasks.filter(
                                            t => t.priority === key
                                        ).length;

                                        const pct =
                                            dashboardStats.total > 0
                                                ? Math.round((count / dashboardStats.total) * 100)
                                                : 0;

                                        return (
                                            <div key={key} className="space-y-1">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className={`font-bold ${text}`}>
                                                        {label}
                                                    </span>

                                                    <span className="text-slate-400 font-bold text-[11px]">
                                                        {count} {count === 1 ? 'Task' : 'Tasks'}
                                                    </span>
                                                </div>

                                                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                                    <div
                                                        className={`h-full ${color} ${shadow} rounded-full transition-all`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>

                        {/* EMPTY ROW - REMOVED RESOURCE CAPACITY AND QUICK SHORTCUTS */}
                        <div id="dashboard_issues_row" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        </div>
                    </div>
                )}

                {/* ==========================================================
            TAB VIEW: PROJECTS (GRID OR DEDICATED KANBAN BOARD)
            ========================================================== */}
                {activeTab === 'projects' && (
                    <div id="view_projects" className="space-y-6 animate-fade-in">
                        {selectedKanbanProjectId ? (
                            /* KANBAN BOARD VIEW FOR SELECTED PROJECT */
                            (() => {
                                const currentProj = projects.find(p => p.id === selectedKanbanProjectId) || projects[0];
                                if (!currentProj) {
                                    return (
                                        <div className="p-12 text-center bg-white/5 border border-white/10 rounded-2xl">
                                            <p className="text-slate-400 mb-4">Project not found or removed.</p>
                                            <button
                                                onClick={() => setSelectedKanbanProjectId(null)}
                                                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs"
                                            >
                                                Return to All Projects
                                            </button>
                                        </div>
                                    );
                                }

                                const projTasks = tasks.filter(t => t.project_id === currentProj.id);
                                const filteredTasks = projTasks;

                                const countToDo = projTasks.filter(t => t.status === 'TO_DO').length;
                                const countInProgress = projTasks.filter(t => t.status === 'IN_PROGRESS').length;
                                const countBlocked = projTasks.filter(t => t.status === 'BLOCKED').length;
                                const countDone = projTasks.filter(t => t.status === 'DONE').length;

                                const KANBAN_STAGES: Array<{
                                    key: Task['status'];
                                    label: string;
                                    count: number;
                                    icon: any;
                                    badgeColor: string;
                                    headerBorder: string;
                                    dotColor: string;
                                    accentBg: string;
                                }> = [
                                        {
                                            key: 'TO_DO',
                                            label: 'To Do',
                                            count: countToDo,
                                            icon: CheckSquare,
                                            badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
                                            headerBorder: 'border-slate-700/60',
                                            dotColor: 'bg-slate-400',
                                            accentBg: 'from-slate-500/10 to-transparent'
                                        },
                                        {
                                            key: 'IN_PROGRESS',
                                            label: 'In Progress',
                                            count: countInProgress,
                                            icon: Activity,
                                            badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                                            headerBorder: 'border-indigo-500/40',
                                            dotColor: 'bg-indigo-400',
                                            accentBg: 'from-indigo-500/10 to-transparent'
                                        },
                                        {
                                            key: 'BLOCKED',
                                            label: 'Blocked',
                                            count: countBlocked,
                                            icon: AlertTriangle,
                                            badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                                            headerBorder: 'border-rose-500/40',
                                            dotColor: 'bg-rose-400',
                                            accentBg: 'from-rose-500/10 to-transparent'
                                        },
                                        {
                                            key: 'DONE',
                                            label: 'Done',
                                            count: countDone,
                                            icon: CheckCircle2,
                                            badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                                            headerBorder: 'border-emerald-500/40',
                                            dotColor: 'bg-emerald-400',
                                            accentBg: 'from-emerald-500/10 to-transparent'
                                        }
                                    ];

                                return (
                                    <div className="space-y-6">
                                        {/* KANBAN TOP ACTION BAR */}
                                        <div className="flex items-center justify-between gap-4 p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <button
                                                    onClick={() => setSelectedKanbanProjectId(null)}
                                                    className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl border border-white/10 transition-all cursor-pointer shadow-md group"
                                                >
                                                    <ArrowLeft className="w-4 h-4 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
                                                    <span>Back to All Projects</span>
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setNewTaskForm({
                                                        title: '',
                                                        description: '',
                                                        status: 'TO_DO',
                                                        project_id: currentProj.id,
                                                        priority: 'MEDIUM',
                                                        end_date: TODAY_STR,
                                                        assigned_to: users.filter(u => u.is_active)[0]?.id || currentUser.id
                                                    });
                                                    setIsCreateTaskModalOpen(true);
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span>Add Task</span>
                                            </button>
                                        </div>

                                        {/* KANBAN BOARD 4-COLUMN SWIMLANES */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
                                            {KANBAN_STAGES.map((stage) => {
                                                const stageTasks = filteredTasks.filter(t => t.status === stage.key);
                                                const isOver = dragOverColumn === stage.key;
                                                const StageIcon = stage.icon;

                                                return (
                                                    <div
                                                        key={stage.key}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            e.dataTransfer.dropEffect = 'move';
                                                            if (dragOverColumn !== stage.key) {
                                                                setDragOverColumn(stage.key);
                                                            }
                                                        }}
                                                        onDragLeave={() => {
                                                            if (dragOverColumn === stage.key) {
                                                                setDragOverColumn(null);
                                                            }
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                                                            if (taskId) {
                                                                handleUpdateTaskField(taskId, 'status', stage.key);
                                                            }
                                                            setDraggedTaskId(null);
                                                            setDragOverColumn(null);
                                                        }}
                                                        className={`flex flex-col rounded-2xl border backdrop-blur-xl transition-all min-h-[500px] ${isOver
                                                            ? 'bg-indigo-900/20 border-indigo-500/60 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                                                            : 'bg-slate-900/40 border-white/10'
                                                            }`}
                                                    >
                                                        {/* Column Header */}
                                                        <div className={`p-4 border-b ${stage.headerBorder} flex items-center justify-between rounded-t-2xl bg-gradient-to-b ${stage.accentBg}`}>
                                                            <div className="flex items-center gap-2.5">
                                                                <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor} shadow-sm`} />
                                                                <StageIcon className="w-4 h-4 text-slate-300" />
                                                                <h3 className="text-xs font-bold uppercase tracking-wider text-white">{stage.label}</h3>
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${stage.badgeColor}`}>
                                                                    {stageTasks.length}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Task Cards Column Body */}
                                                        <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[70vh]">
                                                            {stageTasks.length === 0 ? (
                                                                <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-white/5 rounded-xl">
                                                                    <p className="text-[10px] text-slate-600 mt-0.5">DROP HERE</p>
                                                                </div>
                                                            ) : (
                                                                stageTasks.map((task) => {
                                                                    const overdue = isTaskOverdue(task);
                                                                    const taskCommentsCount = comments.filter(c => c.task_id === task.id).length;
                                                                    const isBeingDragged = draggedTaskId === task.id;

                                                                    return (
                                                                        <div
                                                                            key={task.id}
                                                                            draggable
                                                                            onDragStart={(e) => {
                                                                                e.dataTransfer.setData('text/plain', task.id);
                                                                                e.dataTransfer.effectAllowed = 'move';
                                                                                setDraggedTaskId(task.id);
                                                                            }}
                                                                            onDragEnd={() => {
                                                                                setDraggedTaskId(null);
                                                                                setDragOverColumn(null);
                                                                            }}
                                                                            className={`p-4 bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-indigo-500/40 rounded-xl transition-all shadow-md group relative cursor-grab active:cursor-grabbing ${isBeingDragged ? 'opacity-40 scale-95 border-dashed border-indigo-400' : ''
                                                                                }`}
                                                                        >
                                                                            {/* Top Row: Priority Pill & Actions */}
                                                                            <div className="flex items-center justify-between gap-2 mb-2.5">
                                                                                <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${task.priority === 'CRITICAL'
                                                                                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                                                                    : task.priority === 'HIGH'
                                                                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                                                        : task.priority === 'MEDIUM'
                                                                                            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                                                                            : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                                                                                    }`}>
                                                                                    <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 'CRITICAL' ? 'bg-rose-400' :
                                                                                        task.priority === 'HIGH' ? 'bg-amber-400' :
                                                                                            task.priority === 'MEDIUM' ? 'bg-indigo-400' : 'bg-slate-400'
                                                                                        }`} />
                                                                                    {task.priority}
                                                                                </span>
                                                                            </div>

                                                                            {/* Task Title & Description */}
                                                                            <h4
                                                                                onClick={() => setSelectedTaskId(task.id)}
                                                                                className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors mb-1.5 cursor-pointer leading-snug"
                                                                            >
                                                                                {task.title}
                                                                            </h4>

                                                                            {/* Task Meta Footer */}
                                                                            <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2 text-[10px]">
                                                                                {/* Assignee */}
                                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                                    <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                                                                        {getUserInitials(task.assigned_to)}
                                                                                    </div>
                                                                                    <span className="text-slate-300 font-medium truncate max-w-[80px]">
                                                                                        {getUserName(task.assigned_to).split(' ')[0]}
                                                                                    </span>
                                                                                </div>

                                                                                <div className="flex items-center gap-2 shrink-0">

                                                                                    {/* Due date */}
                                                                                    {task.end_date && (
                                                                                        <span className={`flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded ${overdue
                                                                                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                                                                            : 'text-slate-400'
                                                                                            }`}>
                                                                                            {overdue && <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />}
                                                                                            {task.end_date}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>


                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            /* PROJECTS GRID OVERVIEW */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {projects.map((proj) => (
                                    <div key={proj.id} className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col justify-between group hover:border-indigo-500/30 transition-all shadow-xl hover:shadow-indigo-500/5">
                                        <div>
                                            <div className="flex items-center justify-between mb-4">

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditProjectClick(proj);
                                                        }}
                                                        className="p-1 hover:bg-white/10 text-slate-400 hover:text-indigo-400 rounded transition-all cursor-pointer"
                                                        title="Edit Project"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteProjectClick(proj.id);
                                                        }}
                                                        className="p-1 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded transition-all cursor-pointer"
                                                        title="Delete Project & Tasks"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="text-slate-500 text-[10px] font-semibold ml-1">
                                                        {new Date(proj.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <h3
                                                onClick={() => setSelectedKanbanProjectId(proj.id)}
                                                className="text-base font-extrabold text-white group-hover:text-indigo-400 transition-colors mb-2 cursor-pointer flex items-center justify-between"
                                                title="Click to open Kanban board"
                                            >
                                                <span>{proj.name}</span>
                                                <Kanban className="w-4 h-4 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                                            </h3>
                                            <p className="text-xs text-slate-400 mb-6 leading-relaxed line-clamp-3">{proj.description}</p>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400 font-medium">Project Owner:</span>
                                                <span className="text-slate-200 font-bold">{getUserName(proj.owner_id)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Blank Add Card shortcut */}
                                <div
                                    onClick={() => setIsCreateProjectModalOpen(true)}
                                    className="p-6 bg-white/5 backdrop-blur-md border border-white/10 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/10 transition-all min-h-[250px]"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                                        <Plus className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <h4 className="text-sm font-bold text-white">Add New Project Domain</h4>
                                    <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Establish an isolated codebase workspace scope for sprint tasks.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ==========================================================
            TAB VIEW: TASKS (JIRA BOARD STREAM WITH FILTERS)
            ========================================================== */}
                {activeTab === 'tasks' && (
                    <div id="view_tasks" className="space-y-6 animate-fade-in">

                        {/* CENTRAL FILTER BAR */}
                        <section id="tasks_filters" className="p-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl space-y-4">
                            <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch">

                                {/* Search field */}
                                <div className="flex-1 relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                    <input
                                        id="filter_task_search"
                                        type="text"
                                        placeholder="Search tasks title, descriptions..."
                                        value={taskSearch}
                                        onChange={(e) => setTaskSearch(e.target.value)}
                                        className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                {/* Reset Filters shortcut */}
                                <button
                                    id="btn_reset_filters"
                                    onClick={() => {
                                        setTaskSearch('');
                                        setTaskStatusFilter('ALL');
                                        setTaskPriorityFilter('ALL');
                                        setTaskAssigneeFilter('ALL');
                                        setTaskProjectFilter('ALL');
                                        setTaskOverdueOnly(false);
                                    }}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                                >
                                    Clear All Filters
                                </button>
                            </div>

                            {/* Advanced multi dropdown selectors */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                                <div>
                                    <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Status</label>
                                    <select
                                        id="filter_status"
                                        value={taskStatusFilter}
                                        onChange={(e) => setTaskStatusFilter(e.target.value)}
                                        className="w-full bg-slate-900/60 border border-white/10 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                                    >
                                        <option value="ALL">All Statuses</option>
                                        <option value="TO_DO">To Do</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="BLOCKED">Blocked</option>
                                        <option value="DONE">Done</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Priority</label>
                                    <select
                                        id="filter_priority"
                                        value={taskPriorityFilter}
                                        onChange={(e) => setTaskPriorityFilter(e.target.value)}
                                        className="w-full bg-slate-900/60 border border-white/10 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                                    >
                                        <option value="ALL">All Priorities</option>
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Assignee</label>
                                    <select
                                        id="filter_assignee"
                                        value={taskAssigneeFilter}
                                        onChange={(e) => setTaskAssigneeFilter(e.target.value)}
                                        className="w-full bg-slate-900/60 border border-white/10 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                                    >
                                        <option value="ALL">All Team</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Project</label>
                                    <select
                                        id="filter_project"
                                        value={taskProjectFilter}
                                        onChange={(e) => setTaskProjectFilter(e.target.value)}
                                        className="w-full bg-slate-900/60 border border-white/10 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                                    >
                                        <option value="ALL">All Projects</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col justify-end">
                                    {/* Overdue checkbox */}
                                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-900/60 border border-white/10 rounded-lg select-none">
                                        <input
                                            id="filter_overdue"
                                            type="checkbox"
                                            checked={taskOverdueOnly}
                                            onChange={(e) => setTaskOverdueOnly(e.target.checked)}
                                            className="accent-indigo-500"
                                        />
                                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Overdue Only</span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* RESULTS STREAM TABLE */}
                        <section id="tasks_stream_list" className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Task Board Registry</h3>
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-bold">
                                    Matches: {filteredTasks.length} tasks
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-white/10 bg-slate-950/20">
                                        <tr>
                                            <th className="px-6 py-4">Task Name</th>
                                            <th className="px-6 py-4">Project</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Priority</th>
                                            <th className="px-6 py-4">Assignee</th>
                                            <th className="px-6 py-4">Deadline</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs divide-y divide-white/5">
                                        {filteredTasks.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                                                    No tasks matching current filter configurations. Try clearing the filter criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredTasks.map((task) => {
                                                const isOverdue = isTaskOverdue(task);
                                                return (
                                                    <tr
                                                        key={task.id}
                                                        onClick={() => setSelectedTaskId(task.id)}
                                                        className="hover:bg-white/5 cursor-pointer transition-colors group"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">{task.title}</div>
                                                            <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">
                                                                CODE-{task.id.replace('t_', '').slice(-4).toUpperCase()}
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            <span className="text-xs font-semibold text-slate-300">
                                                                {getProjectName(task.project_id)}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-4 font-bold">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${task.status === 'TO_DO' ? 'bg-slate-500/10 text-slate-400 border-white/10' :
                                                                task.status === 'IN_PROGRESS' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                                    task.status === 'BLOCKED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' :
                                                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${task.status === 'TO_DO' ? 'bg-slate-400' :
                                                                    task.status === 'IN_PROGRESS' ? 'bg-indigo-400' :
                                                                        task.status === 'BLOCKED' ? 'bg-rose-400' :
                                                                            'bg-emerald-400'
                                                                    }`}></span>
                                                                {task.status.replace('_', ' ')}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-0.5 text-[9px] rounded-full font-black border uppercase tracking-wider ${task.priority === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.15)]' :
                                                                task.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                    task.priority === 'MEDIUM' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                        'bg-slate-500/10 text-slate-400 border-white/10'
                                                                }`}>
                                                                {task.priority}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-lg bg-slate-800 text-[10px] text-slate-300 font-extrabold flex items-center justify-center border border-white/5 shrink-0">
                                                                    {getUserInitials(task.assigned_to)}
                                                                </div>
                                                                <span className="font-medium text-slate-300 truncate max-w-[120px]">{getUserName(task.assigned_to)}</span>
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className={`text-[11px] font-bold ${isOverdue ? 'text-rose-400' : 'text-slate-300'}`}>
                                                                    {task.end_date}
                                                                </span>
                                                                {isOverdue && (
                                                                    <span className="text-[9px] text-rose-500 font-extrabold uppercase tracking-widest mt-0.5">OVERDUE RISK</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}

                {/* ==========================================================
            TAB VIEW: TEAM MANAGEMENT
            ========================================================== */}
                {activeTab === 'team' && (
                    <div id="view_team" className="space-y-6 animate-fade-in">
                        {/* Team management view wrapper */}
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden p-6">

                            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 border-b border-white/5 pb-4">
                                <div className="flex-1 max-w-md relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                    <input
                                        id="team_search_input"
                                        type="text"
                                        placeholder="Search users by name, email..."
                                        value={teamSearch}
                                        onChange={(e) => setTeamSearch(e.target.value)}
                                        className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    {currentUser.role === 'Admin' && (
                                        <button
                                            id="team_btn_add_user"
                                            onClick={() => {
                                                setNewUserForm({ first_name: '', last_name: '', email: '', role: 'Team Member', is_active: true });
                                                setIsCreateUserModalOpen(true);
                                            }}
                                            className="px-4 py-2 bg-cyan-600/30 border border-cyan-500/30 hover:bg-cyan-600/40 text-cyan-200 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Team Member</span>
                                        </button>
                                    )}

                                    {currentUser.role !== 'Admin' && (
                                        <div className="text-xs text-amber-400 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
                                            <Lock className="w-4 h-4 shrink-0" />
                                            <span>User editing restricted to system Administrators.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Grid / Table showing team roster */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-white/10 bg-slate-950/10">
                                        <tr>
                                            <th className="px-6 py-3.5">Full Name</th>
                                            <th className="px-6 py-3.5">Registered Email</th>
                                            <th className="px-6 py-3.5">Assigned Security Role</th>
                                            <th className="px-6 py-3.5">System Status</th>
                                            <th className="px-6 py-3.5 text-right">Administrative Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs divide-y divide-white/5">
                                        {users
                                            .filter(u => {
                                                if (!teamSearch.trim()) return true;
                                                const term = teamSearch.toLowerCase();
                                                return (
                                                    u.first_name.toLowerCase().includes(term) ||
                                                    u.last_name.toLowerCase().includes(term) ||
                                                    u.email.toLowerCase().includes(term) ||
                                                    u.role.toLowerCase().includes(term)
                                                );
                                            })
                                            .map((u) => {
                                                const isSelf = u.id === currentUser.id;
                                                const isEditingThisUser = editingUserId === u.id;

                                                return (
                                                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4">
                                                            {isEditingThisUser ? (
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editUserForm.first_name}
                                                                        onChange={(e) => setEditUserForm({ ...editUserForm, first_name: e.target.value })}
                                                                        className="bg-slate-900 border border-white/10 p-1.5 rounded text-white text-xs w-24 focus:outline-none"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={editUserForm.last_name}
                                                                        onChange={(e) => setEditUserForm({ ...editUserForm, last_name: e.target.value })}
                                                                        className="bg-slate-900 border border-white/10 p-1.5 rounded text-white text-xs w-24 focus:outline-none"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500/30 to-cyan-500/30 text-white font-extrabold flex items-center justify-center text-[10px]">
                                                                        {getUserInitials(u.id)}
                                                                    </div>
                                                                    <span className="font-bold text-white">
                                                                        {u.first_name} {u.last_name} {isSelf && <span className="text-[10px] text-indigo-400 font-bold ml-1">(You)</span>}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            {isEditingThisUser ? (
                                                                <input
                                                                    type="email"
                                                                    value={editUserForm.email}
                                                                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                                                                    className="bg-slate-900 border border-white/10 p-1.5 rounded text-white text-xs w-48 focus:outline-none"
                                                                />
                                                            ) : (
                                                                <span className="text-slate-300 font-medium">{u.email}</span>
                                                            )}
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            {isEditingThisUser ? (
                                                                <select
                                                                    value={editUserForm.role}
                                                                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as any })}
                                                                    className="bg-slate-900 border border-white/10 p-1.5 rounded text-slate-300 text-xs focus:outline-none"
                                                                >
                                                                    <option value="Admin">Admin</option>
                                                                    <option value="Team Member">Team Member</option>
                                                                </select>
                                                            ) : (
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${u.role === 'Admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border border-white/10'
                                                                    }`}>
                                                                    {u.role}
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            {isEditingThisUser ? (
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={editUserForm.is_active}
                                                                        onChange={(e) => setEditUserForm({ ...editUserForm, is_active: e.target.checked })}
                                                                        className="accent-indigo-500"
                                                                    />
                                                                    <span className="text-xs text-slate-300">Active</span>
                                                                </label>
                                                            ) : (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                                                    }`}>
                                                                    {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex gap-2 justify-end">
                                                                {isEditingThisUser ? (
                                                                    <>
                                                                        <button
                                                                            onClick={handleUpdateUser}
                                                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold cursor-pointer"
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingUserId(null)}
                                                                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-[10px] font-bold cursor-pointer"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {currentUser.role === 'Admin' && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleEditUserClick(u)}
                                                                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
                                                                                    title="Edit User Info"
                                                                                >
                                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                                </button>

                                                                                <button
                                                                                    onClick={() => toggleUserActiveState(u.id)}
                                                                                    disabled={isSelf}
                                                                                    className={`p-1.5 bg-white/5 rounded-lg transition-all cursor-pointer ${isSelf ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'
                                                                                        }`}
                                                                                    title={u.is_active ? "Deactivate User" : "Activate User"}
                                                                                >
                                                                                    {u.is_active ? (
                                                                                        <UserX className="w-3.5 h-3.5 text-rose-400" />
                                                                                    ) : (
                                                                                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    onClick={() => handleDeleteUser(u.id)}
                                                                                    disabled={isSelf}
                                                                                    className={`p-1.5 bg-white/5 rounded-lg transition-all cursor-pointer text-rose-400 ${isSelf ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 hover:text-rose-300 hover:bg-rose-500/10'
                                                                                        }`}
                                                                                    title="Delete User permanently"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* ==========================================
          TASK SLIDE OVER DETAILS & COMMENTS PANEL
          ========================================== */}
            {selectedTask && (
                <div id="task_details_drawer" className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                    {/* Backdrop overlay */}
                    <div
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedTaskId(null)}
                    ></div>

                    {/* Sliding container */}
                    <div className="relative w-full max-w-xl bg-slate-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl h-full flex flex-col p-6 overflow-y-auto">

                        {/* Header */}
                        <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/10">
                            <div className="min-w-0 pr-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950 border border-white/5 px-2 py-0.5 rounded-md">
                                    {getProjectName(selectedTask.project_id)}
                                </span>
                                <h3 className="text-lg font-black text-white mt-2 truncate leading-tight">{selectedTask.title}</h3>
                                <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase block mt-1">
                                    ID: CODE-{selectedTask.id.replace('t_', '').toUpperCase()}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedTaskId(null)}
                                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {(() => {
                            const activeTask = taskDraft || selectedTask;
                            const hasChanges = JSON.stringify(taskDraft) !== JSON.stringify(selectedTask);
                            return (
                                <>
                                    {/* Interactive Control Selectors */}
                                    <div className="grid grid-cols-2 gap-4 mb-6 bg-white/5 p-4 rounded-xl border border-white/5">

                                        <div>
                                            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">State Status</label>
                                            <select
                                                value={activeTask.status}
                                                onChange={(e) => handleUpdateDraftField('status', e.target.value)}
                                                className="w-full text-xs bg-slate-950/80 border border-white/10 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="TO_DO">To Do</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="BLOCKED">Blocked</option>
                                                <option value="DONE">Done Deployed</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Priority</label>
                                            <select
                                                value={activeTask.priority}
                                                onChange={(e) => handleUpdateDraftField('priority', e.target.value)}
                                                className="w-full text-xs bg-slate-950/80 border border-white/10 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="LOW">Low</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HIGH">High</option>
                                                <option value="CRITICAL">Critical</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Assignee</label>
                                            <select
                                                value={activeTask.assigned_to}
                                                onChange={(e) => handleUpdateDraftField('assigned_to', e.target.value)}
                                                className="w-full text-xs bg-slate-950/80 border border-white/10 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                            >
                                                {users.filter(u => u.is_active).map(u => (
                                                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Deadline Date</label>
                                            <DatePicker
                                                value={activeTask.end_date}
                                                onChange={(dateStr) => handleUpdateDraftField('end_date', dateStr)}
                                            />
                                        </div>

                                    </div>

                                    {/* Core Description Text Area */}
                                    <div className="space-y-2 mb-6">
                                        <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Requirement Description</label>
                                        <textarea
                                            value={activeTask.description}
                                            onChange={(e) => handleUpdateDraftField('description', e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 min-h-[100px] leading-relaxed"
                                            placeholder="Detailed sprint objectives and code path constraints..."
                                        />
                                    </div>

                                    {/* Metadata information */}
                                    <div className="grid grid-cols-2 gap-4 p-3 bg-white/5 border border-white/5 rounded-xl text-[11px] text-slate-400 mb-6">
                                        <div>
                                            <span className="block font-semibold">Created By:</span>
                                            <span className="text-slate-200">{getUserName(activeTask.created_by)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-semibold">Timeline Added:</span>
                                            <span className="text-slate-200">{new Date(activeTask.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Save Actions and Status Row */}
                                    <div className="flex items-center justify-between gap-4 p-4 bg-slate-950/40 border border-white/5 rounded-xl mb-6 border-dashed">
                                        <div className="flex items-center gap-2">
                                            {hasChanges ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                                    <AlertCircle className="w-3 h-3" /> Unsaved Changes
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-800/50 text-slate-400 border border-white/5">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Synced
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleSaveTaskDetails}
                                            disabled={!hasChanges}
                                            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${hasChanges
                                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.98]'
                                                : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                                                }`}
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Save Task Details</span>
                                        </button>
                                    </div>

                                    {/* Danger Zone Controls */}
                                    <div className="mb-6 flex justify-end">
                                        <button
                                            onClick={() => handleDeleteTask(activeTask.id)}
                                            className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/20 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Delete Task Requirement</span>
                                        </button>
                                    </div>
                                </>
                            );
                        })()}

                        {/* ==========================================================
                COMMENTS SECTION
                ========================================================== */}
                        <div className="border-t border-white/10 pt-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-300 mb-4 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-indigo-400" />
                                <span>Discussion Streams ({selectedTaskComments.length})</span>
                            </h4>

                            {/* Comments Feed list */}
                            <div id="comments_feed" className="space-y-4 mb-4 pr-1">
                                {selectedTaskComments.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500 text-xs font-medium bg-white/5 border border-white/5 rounded-xl">
                                        No comments logged. Start the conversation path below!
                                    </div>
                                ) : (
                                    selectedTaskComments.map((comment) => {
                                        const isOwnComment = comment.commented_by === currentUser.id;
                                        const isEditing = editingCommentId === comment.id;

                                        return (
                                            <div key={comment.id} className="p-3.5 bg-slate-950/40 border border-white/5 rounded-xl space-y-2">
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-bold text-slate-300">{getUserName(comment.commented_by)}</span>
                                                    <span className="text-slate-500 font-semibold">{new Date(comment.created_at).toLocaleString()}</span>
                                                </div>

                                                {isEditing ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={editCommentText}
                                                            onChange={(e) => setEditCommentText(e.target.value)}
                                                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none"
                                                        />
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => handleSaveEditComment(comment.id)}
                                                                className="px-2.5 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingCommentId(null)}
                                                                className="px-2.5 py-1 bg-white/5 text-slate-400 rounded text-[10px] font-bold"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-200 leading-relaxed break-words">{comment.comment_text}</p>
                                                )}

                                                {!isEditing && (isOwnComment || currentUser.role === 'Admin') && (
                                                    <div className="flex justify-end gap-2 border-t border-white/5 pt-2 mt-2">
                                                        {isOwnComment && (
                                                            <button
                                                                onClick={() => handleStartEditComment(comment)}
                                                                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Edit2 className="w-2.5 h-2.5" /> Edit
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteComment(comment)}
                                                            className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <Trash2 className="w-2.5 h-2.5" /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* New Comment Logging form */}
                            <form onSubmit={handleAddComment} className="mt-auto">
                                <div className="relative">
                                    <input
                                        id="new_comment_input"
                                        type="text"
                                        placeholder="Enter discussion logs, code reviews..."
                                        value={newCommentText}
                                        onChange={(e) => setNewCommentText(e.target.value)}
                                        className="w-full bg-slate-950/80 border border-white/10 rounded-xl py-3 pl-4 pr-14 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="submit"
                                        className="absolute right-2.5 top-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                    >
                                        Send
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            )}

            {/* ==========================================================
          MODAL: CREATE TASK
          ========================================================== */}
            {isCreateTaskModalOpen && (
                <div id="modal_create_task" className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsCreateTaskModalOpen(false)}></div>

                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scale-up z-10">
                        <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
                            <h3 className="text-base font-extrabold text-white">Create Task</h3>
                            <button onClick={() => setIsCreateTaskModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Task Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Set up API Gateway Routing"
                                    value={newTaskForm.title}
                                    onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Project Workspace</label>
                                <select
                                    required
                                    value={newTaskForm.project_id}
                                    onChange={(e) => setNewTaskForm({ ...newTaskForm, project_id: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none"
                                >
                                    <option value="" disabled>Select Workspace...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Priority</label>
                                    <select
                                        value={newTaskForm.priority}
                                        onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as any })}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Timeline Deadline</label>
                                    <DatePicker
                                        value={newTaskForm.end_date}
                                        onChange={(dateStr) => setNewTaskForm({ ...newTaskForm, end_date: dateStr })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Assignee</label>
                                <select
                                    required
                                    value={newTaskForm.assigned_to}
                                    onChange={(e) => setNewTaskForm({ ...newTaskForm, assigned_to: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none"
                                >
                                    <option value="" disabled>Select member...</option>
                                    {users.filter(u => u.is_active).map(u => (
                                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Description</label>
                                <textarea
                                    placeholder="Task details, implementation metrics, tests expected..."
                                    value={newTaskForm.description}
                                    onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none min-h-[80px]"
                                />
                            </div>

                            <div className="flex gap-2 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateTaskModalOpen(false)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 cursor-pointer"
                                >
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==========================================================
          MODAL: CREATE PROJECT
          ========================================================== */}
            {isCreateProjectModalOpen && (
                <div id="modal_create_project" className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => {
                        setIsCreateProjectModalOpen(false);
                        setEditingProjectId(null);
                        setNewProjectForm({ name: '', description: '', owner_id: '' });
                    }}></div>

                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up z-10">
                        <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
                            <h3 className="text-base font-extrabold text-white">
                                {editingProjectId ? 'Edit Project Workspace Domain' : 'Establish Workspace Scope'}
                            </h3>
                            <button onClick={() => {
                                setIsCreateProjectModalOpen(false);
                                setEditingProjectId(null);
                                setNewProjectForm({ name: '', description: '', owner_id: '' });
                            }} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Project Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. API V4 Core"
                                    value={newProjectForm.name}
                                    onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Domain Purpose Scope</label>
                                <textarea
                                    placeholder="Define general boundaries and launch directives..."
                                    value={newProjectForm.description}
                                    onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none min-h-[100px]"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Product Owner</label>
                                <select
                                    value={newProjectForm.owner_id || currentUser.id}
                                    onChange={(e) => setNewProjectForm({ ...newProjectForm, owner_id: e.target.value })}
                                    className="w-full text-xs bg-slate-950 border border-white/10 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                                >
                                    {users.filter(u => u.is_active).map(u => (
                                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateProjectModalOpen(false);
                                        setEditingProjectId(null);
                                        setNewProjectForm({ name: '', description: '', owner_id: '' });
                                    }}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 cursor-pointer"
                                >
                                    {editingProjectId ? 'Save Workspace Changes' : 'Initialize Project Domain'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==========================================================
          MODAL: CREATE TEAM USER (Admin Only)
          ========================================================== */}
            {isCreateUserModalOpen && (
                <div id="modal_create_user" className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsCreateUserModalOpen(false)}></div>

                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up z-10">
                        <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
                            <h3 className="text-base font-extrabold text-white">Add Team Member Roster</h3>
                            <button onClick={() => setIsCreateUserModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">First Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Jordan"
                                        value={newUserForm.first_name}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, first_name: e.target.value })}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Smith"
                                        value={newUserForm.last_name}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, last_name: e.target.value })}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Workspace Email</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="jordan@broai.com"
                                    value={newUserForm.email}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Access Role Privilege</label>
                                <select
                                    value={newUserForm.role}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none"
                                >
                                    <option value="Team Member">Team Member (Task editing discuss only)</option>
                                    <option value="Admin">Administrator (Full User Registry Modification)</option>
                                </select>
                            </div>

                            <div className="flex gap-2 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateUserModalOpen(false)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 cursor-pointer"
                                >
                                    Save & Register Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==========================================================
          MODAL: CONFIRM TASK DELETE
          ========================================================== */}
            {taskToDeleteId && (
                <div id="modal_confirm_task_delete" className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setTaskToDeleteId(null)}></div>

                    <div className="relative bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up z-10">
                        <div className="flex items-center gap-3 mb-4 text-rose-400">
                            <AlertTriangle className="w-6 h-6 shrink-0 animate-pulse" />
                            <h3 className="text-base font-extrabold text-white">Delete Task Requirement?</h3>
                        </div>

                        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                            Are you sure you want to permanently delete task <span className="font-bold text-white">"{tasks.find(t => t.id === taskToDeleteId)?.title}"</span>? This action will remove it from the dashboard, projects registry, and delete all associated discussion comments. This cannot be undone.
                        </p>

                        <div className="flex gap-2.5 justify-end">
                            <button
                                type="button"
                                onClick={() => setTaskToDeleteId(null)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                                Cancel, Keep Task
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteTask}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 cursor-pointer transition-colors"
                            >
                                Yes, Delete Task
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================================
          MODAL: CONFIRM COMMENT DELETE
          ========================================================== */}
            {commentToDelete && (
                <div id="modal_confirm_comment_delete" className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setCommentToDelete(null)}></div>

                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up z-10">
                        <div className="flex items-center gap-3 mb-4 text-amber-400">
                            <AlertCircle className="w-6 h-6 shrink-0" />
                            <h3 className="text-base font-extrabold text-white">Delete Discussion Log?</h3>
                        </div>

                        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                            Are you sure you want to permanently remove this comment? This log will be expunged from the discussion stream.
                        </p>

                        <div className="flex gap-2.5 justify-end">
                            <button
                                type="button"
                                onClick={() => setCommentToDelete(null)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteComment}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                                Delete Log
                            </button>
                        </div>
                    </div>
                </div>
            )}      {/* ==========================================================
          MODAL: CONFIRM USER DELETE
          ========================================================== */}
            {userToDeleteId && (
                <div id="modal_confirm_user_delete" className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setUserToDeleteId(null)}></div>

                    <div className="relative bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up z-10">
                        <div className="flex items-center gap-3 mb-4 text-rose-400">
                            <AlertTriangle className="w-6 h-6 shrink-0 animate-pulse" />
                            <h3 className="text-base font-extrabold text-white">Delete Team Member?</h3>
                        </div>

                        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                            Are you sure you want to permanently delete <span className="font-bold text-white">"{
                                (() => {
                                    const u = users.find(x => x.id === userToDeleteId);
                                    return u ? `${u.first_name} ${u.last_name} (${u.email})` : 'this user';
                                })()
                            }"</span>? This action is irreversible and they will be unassigned from any tasks they were responsible for.
                        </p>

                        <div className="flex gap-2.5 justify-end">
                            <button
                                type="button"
                                onClick={() => setUserToDeleteId(null)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteUser}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 cursor-pointer transition-colors"
                            >
                                Yes, Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================================
          MODAL: CONFIRM PROJECT DELETE
          ========================================================== */}
            {projectToDeleteId && (
                <div id="modal_confirm_project_delete" className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setProjectToDeleteId(null)}></div>

                    <div className="relative bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up z-10">
                        <div className="flex items-center gap-3 mb-4 text-rose-400">
                            <AlertTriangle className="w-6 h-6 shrink-0 animate-pulse" />
                            <h3 className="text-base font-extrabold text-white">Delete Project Workspace?</h3>
                        </div>

                        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                            Are you sure you want to permanently delete the project <span className="font-bold text-white">"{projects.find(p => p.id === projectToDeleteId)?.name}"</span>?
                        </p>
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-6">
                            <p className="text-xs text-rose-400 font-semibold leading-relaxed flex items-center gap-2">
                                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                                <span>CRITICAL CASCADE IMPACT: This action will permanently delete ALL tasks and discussion comments belonging to this project. This is completely irreversible.</span>
                            </p>
                        </div>

                        <div className="flex gap-2.5 justify-end">
                            <button
                                type="button"
                                onClick={() => setProjectToDeleteId(null)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                                Cancel, Keep Workspace
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteProject}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 cursor-pointer transition-colors"
                            >
                                Yes, Delete Project & Tasks
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
