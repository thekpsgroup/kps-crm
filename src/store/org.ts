import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Organization {
  id: string;
  name: string;
}

interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role: string;
  organizations?: Organization;
}

interface OrgStore {
  activeOrgId: string | null;
  organizations: Organization[];
  setActiveOrg: (orgId: string) => void;
  setOrganizations: (orgs: Organization[]) => void;
  addOrganization: (org: Organization) => void;
  clearActiveOrg: () => void;
}

export const useOrgStore = create<OrgStore>()(
  persist(
    (set, get) => ({
      activeOrgId: null,
      organizations: [],

      setActiveOrg: (orgId: string) => {
        set({ activeOrgId: orgId });
      },

      setOrganizations: (orgs: Organization[]) => {
        set({ organizations: orgs });
        // If no active org is set and we have organizations, set the first one as active
        const { activeOrgId } = get();
        if (!activeOrgId && orgs.length > 0) {
          set({ activeOrgId: orgs[0].id });
        }
      },

      addOrganization: (org: Organization) => {
        const { organizations } = get();
        const newOrgs = [...organizations, org];
        set({ organizations: newOrgs });
        // If no active org, make this the active one
        if (!get().activeOrgId) {
          set({ activeOrgId: org.id });
        }
      },

      clearActiveOrg: () => {
        set({ activeOrgId: null });
      },
    }),
    {
      name: 'org-storage',
      // Only persist these fields
      partialize: (state) => ({
        activeOrgId: state.activeOrgId,
        organizations: state.organizations,
      }),
    }
  )
);

// Helper hooks
export const useActiveOrg = () => {
  const { activeOrgId, organizations } = useOrgStore();
  return organizations.find(org => org.id === activeOrgId) || null;
};

export const useActiveOrgId = () => {
  return useOrgStore(state => state.activeOrgId);
};
