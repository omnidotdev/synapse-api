import { describe, expect, mock, test } from "bun:test";

import { checkOrgPermission } from "lib/authz/orgPermission";

const observer = { id: "synapse-row-id", identityProviderId: "idp-user-id" };

describe("checkOrgPermission", () => {
	test("asks Warden about the identity provider user, not the Synapse row", async () => {
		const checkPermission = mock(async () => true);

		await checkOrgPermission(
			{ checkPermission },
			true,
			observer,
			"org-1",
			"admin",
		);

		expect(checkPermission).toHaveBeenCalledWith(
			"idp-user-id",
			"organization",
			"org-1",
			"admin",
		);
	});

	test("denies when Warden denies", async () => {
		await expect(
			checkOrgPermission(
				{ checkPermission: async () => false },
				true,
				observer,
				"org-1",
				"member",
			),
		).rejects.toThrow("requires member");
	});

	test("fails closed in production without an authz client", async () => {
		await expect(
			checkOrgPermission(null, true, observer, "org-1", "member"),
		).rejects.toThrow("Insufficient permissions");
	});

	test("no-ops in development without an authz client", async () => {
		await expect(
			checkOrgPermission(null, false, observer, "org-1", "member"),
		).resolves.toBeUndefined();
	});
});
