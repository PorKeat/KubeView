# Phase 4: Complete Kubernetes Resource Browser Specification

> **Phase Goal:** Build a unified, high-performance resource browser covering all standard Kubernetes resource types and dynamic Custom Resource Definitions (CRDs). Guarantee 60 FPS scrolling on 50,000+ resources using **TanStack Table** and **Go `client-go/dynamic`**.

---

## 1. Functional Scope

### 1.1 Supported Resource Categories
The resource browser organizes resources into intuitive hierarchical categories:

1. **Workloads:** Pods, Deployments, ReplicaSets, StatefulSets, DaemonSets, Jobs, CronJobs.
2. **Cluster & Topology:** Nodes, Namespaces, ResourceQuotas, LimitRanges.
3. **Networking:** Services, Endpoints, EndpointSlices, Ingresses, Gateway API (`GatewayClass`, `Gateway`, `HTTPRoute`, `GRPCRoute`).
4. **Configuration & Secrets:** ConfigMaps, Secrets (with masked values by default and RBAC-controlled unmasking).
5. **Storage:** PersistentVolumes (PV), PersistentVolumeClaims (PVC), StorageClasses, VolumeAttachments.
6. **Access Control (RBAC):** ServiceAccounts, Roles, RoleBindings, ClusterRoles, ClusterRoleBindings.
7. **Scaling & Reliability:** HorizontalPodAutoscalers (HPA), PodDisruptionBudgets (PDB).
8. **Network Policies:** NetworkPolicies.
9. **Custom Resources:** Dynamic CRD discovery and generic custom resource inspector.

### 1.2 Table Grid Standards (TanStack Table)
Every resource table adheres to strict UX standards:
- **Compact Density:** 32px-36px row height with readable Geist typography.
- **Status Indicators:** Immediate visual pills (Green `#38B879` Running, Amber `#F5A623` Pending, Red `#E05252` Failed, Muted `#8A919E` Completed).
- **Fast Search & Filter:** Instant fuzzy search across resource names, labels, and namespaces.
- **Multi-Column Sorting:** Click-to-sort on age, name, status, restarts, CPU/Memory usage.
- **Column Customization:** Toggle column visibility, reorder columns via drag-and-drop, and resize column widths. Column layouts persist per resource type in local storage.
- **Detail Slide-Over:** Clicking any row opens a comprehensive side drawer displaying:
  - Formatted overview (Metadata, Annotations, Labels, Conditions, Spec, Status).
  - Related resources (e.g. Pods belonging to a Deployment, Endpoints for a Service).
  - Quick action toolbar (View YAML, Edit, Delete, Scale, Restart).

### 1.3 High-Performance Virtualization
- TanStack Table v8 coupled with virtualized DOM row rendering.
- Handles enterprise clusters with 10,000+ pods and 1,000+ nodes without memory degradation or input lag.

### 1.4 Custom Resource Definition (CRD) Engine
- Go engine uses `k8s.io/client-go/dynamic` to list and watch arbitrary CRDs.
- Introspects `additionalPrinterColumns` from `CustomResourceDefinition` specs to automatically generate table columns, headers, JSONPaths, and priority.
- Full CRUD inspection for any custom resource (e.g., ArgoCD `Application`, Cert-Manager `Certificate`, Istio `VirtualService`).

---

## 2. Technical Implementation Architecture

```
ResourceBrowserView
├── ResourceToolbar
│   ├── SearchInput (fuzzy matching)
│   ├── NamespaceFilter
│   ├── LabelSelectorFilter
│   ├── ColumnVisibilityMenu
│   └── RefreshButton
├── VirtualizedResourceTable (TanStack Table + Virtualization)
│   ├── TableHeader (Sortable, resizable columns)
│   ├── VirtualRowList (60 FPS smooth scroll, 32px height)
│   └── TablePagination / ItemCountFooter
└── ResourceDetailDrawer (Slide-over)
    ├── OverviewTab (Formatted Spec/Status)
    ├── EventsTab (Recent events for this resource)
    ├── YamlTab (Embedded read-only Monaco view)
    └── RelatedResourcesTab (Parent/Child relationships)
```

---

## 3. Acceptance Criteria & Quality Gates

1. **Large Cluster Scale:** Table with 10,000 live/mock pods scrolls at 60 FPS without memory leaks or frame drops.
2. **Filter Latency:** Typing in the search bar updates the visible table rows within 16 milliseconds.
3. **CRD Discovery:** Any newly installed CRD in the cluster appears automatically in the sidebar within 2 seconds with its custom printer columns.
4. **Consistency:** All 20+ resource types share identical keyboard shortcuts, layout patterns, and detail drawers.
