export const INITIAL_USERS = [
  {
    id: "u1",
    first_name: "Alex",
    last_name: "Robinson",
    email: "alex@broai.com",
    role: "Admin",
    is_active: 1,
    password: "admin123",
    created_at: "2026-01-10T09:00:00Z",
    updated_at: "2026-01-10T09:00:00Z"
  },
  {
    id: "u2",
    first_name: "Jordan",
    last_name: "Hayes",
    email: "jordan@broai.com",
    role: "Team Member",
    is_active: 1,
    password: "user123",
    created_at: "2026-02-14T10:30:00Z",
    updated_at: "2026-02-14T10:30:00Z"
  },
  {
    id: "u3",
    first_name: "Maria",
    last_name: "Garcia",
    email: "maria@broai.com",
    role: "Team Member",
    is_active: 1,
    password: "user123",
    created_at: "2026-03-01T14:15:00Z",
    updated_at: "2026-03-01T14:15:00Z"
  },
  {
    id: "u4",
    first_name: "Liam",
    last_name: "Chen",
    email: "liam@broai.com",
    role: "Admin",
    is_active: 1,
    password: "admin123",
    created_at: "2026-03-12T11:00:00Z",
    updated_at: "2026-03-12T11:00:00Z"
  }
];

export const INITIAL_PROJECTS = [
  {
    id: "p1",
    name: "Project Nebula",
    description: "Next-generation generative AI infrastructure, distributed neural model fine-tuning, and ultra low-latency inferencing engine.",
    owner_id: "u1",
    created_at: "2026-06-01T10:00:00Z"
  },
  {
    id: "p2",
    name: "Enterprise Core Hub",
    description: "Multi-tenant enterprise access control, compliance audit logging, OAuth2/SAML SSO federation, and unified telemetry dashboard.",
    owner_id: "u4",
    created_at: "2026-06-05T12:30:00Z"
  }
];

export const INITIAL_TASKS = [
  {
    id: "t1",
    title: "Design Authentication Flow",
    description: "Architect and implement high security OAuth2, session handling, and RBAC permission checks across all microservices.",
    status: "IN_PROGRESS",
    project_id: "p1",
    priority: "HIGH",
    end_date: "2026-07-01",
    assigned_to: "u2",
    created_by: "u1",
    created_at: "2026-06-15T10:00:00Z",
    updated_at: "2026-06-18T14:00:00Z"
  },
  {
    id: "t2",
    title: "Deploy Database Sharding",
    description: "Execute zero-downtime distributed sharding migration across multi-region clustered PostgreSQL / SQLite data warehouses.",
    status: "BLOCKED",
    project_id: "p1",
    priority: "CRITICAL",
    end_date: "2026-06-28",
    assigned_to: "u3",
    created_by: "u1",
    created_at: "2026-06-16T11:30:00Z",
    updated_at: "2026-06-20T16:45:00Z"
  },
  {
    id: "t3",
    title: "Security Audit & Pen-Testing",
    description: "Conduct rigorous vulnerability scanning, dynamic application security testing (DAST), and OWASP compliance review.",
    status: "TO_DO",
    project_id: "p2",
    priority: "MEDIUM",
    end_date: "2026-07-10",
    assigned_to: "u4",
    created_by: "u4",
    created_at: "2026-06-18T09:15:00Z",
    updated_at: "2026-06-18T09:15:00Z"
  },
  {
    id: "t4",
    title: "Write Developer Documentation",
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

export const INITIAL_COMMENTS = [
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
