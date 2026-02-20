import { Page } from "@playwright/test";
import { test, expect } from "playwright-test-coverage";
import { User, Role } from "../src/service/pizzaService";

test("home page", async ({ page }) => {
	await page.goto("/");

	expect(await page.title()).toBe("JWT Pizza");
});

async function basicInit(page: Page) {
	let loggedInUser: User | undefined;
	const validUsers: Record<string, User> = {
		"d@jwt.com": {
			id: "3",
			name: "Kai Chen",
			email: "d@jwt.com",
			password: "a",
			roles: [{ role: Role.Diner }],
		},
		"e@jwt.com": {
			id: "4",
			name: "Chai Ken",
			email: "e@jwt.com",
			password: "b",
			roles: [{ role: Role.Admin }],
		},
		"f@jwt.com": {
			id: "2",
			name: "Chein Kai",
			email: "f@jwt.com",
			password: "c",
			roles: [{ role: Role.Franchisee }],
		},
	};

	let franchises = [
		{
			id: 1,
			name: "pizzaPocket",
			admins: [
				{
					id: 2,
					name: "pizza franchisee",
					email: "f@jwt.com",
				},
			],
			stores: [
				{
					id: 1,
					name: "SLC",
					totalRevenue: 1000,
				},
				{
					id: 3,
					name: "Provo",
					totalRevenue: 1500,
				},
			],
		},
		{
			id: 2,
			name: "LotaPizza",
			admins: [
				{
					id: 5,
					name: "Franchise Owner",
					email: "franchisee@jwt.com",
				},
			],
			stores: [
				{
					id: 4,
					name: "Lehi",
					totalRevenue: 2000,
				},
				{
					id: 5,
					name: "Springville",
					totalRevenue: 1800,
				},
				{
					id: 6,
					name: "American Fork",
					totalRevenue: 2200,
				},
			],
		},
		{
			id: 3,
			name: "PizzaCorp",
			admins: [
				{
					id: 4,
					name: "Chai Ken",
					email: "e@jwt.com",
				},
			],
			stores: [
				{
					id: 7,
					name: "Spanish Fork",
					totalRevenue: 1200,
				},
			],
		},
	];

	// Authorize login for the given user
	await page.route("*/**/api/auth", async (route) => {
		const method = route.request().method();
		const data = route.request().postDataJSON?.();

		if (method === "PUT") {
			// login
			const user = validUsers[data.email];
			if (!user || user.password !== data.password) {
				await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
				return;
			}
			loggedInUser = user;
			await route.fulfill({ json: { user: loggedInUser, token: "abcdef" } });
		} else if (method === "DELETE") {
			// logout
			loggedInUser = undefined;
			await route.fulfill({ status: 204 });
		} else if (method === "POST") {
			// register
			if (!data.name || !data.email || !data.password) {
				await route.fulfill({
					status: 400,
					json: { error: "Fill all fields" },
				});
				return;
			}
			if (validUsers[data.email]) {
				await route.fulfill({
					status: 409,
					json: { error: "User already exists" },
				});
				return;
			}
			const newUser: User = {
				id: String(Object.keys(validUsers).length + 1),
				name: data.name,
				email: data.email,
				password: data.password,
				roles: [{ role: Role.Diner }],
			};
			validUsers[data.email] = newUser;
			loggedInUser = newUser;
			await route.fulfill({ json: { user: newUser, token: "abcdef" } });
		} else {
			await route.continue();
		}
	});

	// Return the currently logged in user
	await page.route("*/**/api/user/me", async (route) => {
		await route.fulfill({ json: loggedInUser });
	});

	// A standard menu
	await page.route("*/**/api/order/menu", async (route) => {
		const menuRes = [
			{
				id: 1,
				title: "Veggie",
				image: "pizza1.png",
				price: 0.0038,
				description: "A garden of delight",
			},
			{
				id: 2,
				title: "Pepperoni",
				image: "pizza2.png",
				price: 0.0042,
				description: "Spicy treat",
			},
		];
		await route.fulfill({ json: menuRes });
	});

	// GET and POST /api/franchise - Consolidated handler
	// In basicInit function:

	// 1. Public franchise endpoint (for all users browsing)
	await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
		const method = route.request().method();

		if (method === "GET") {
			// Returns ALL franchises
			const franchiseRes = {
				franchises: [
					{
						id: 2,
						name: "LotaPizza",
						stores: [
							{ id: 4, name: "Lehi" },
							{ id: 5, name: "Springville" },
							{ id: 6, name: "American Fork" },
						],
					},
					{
						id: 3,
						name: "PizzaCorp",
						stores: [{ id: 7, name: "Spanish Fork" }],
					},
					{ id: 4, name: "topSpot", stores: [] },
				],
			};
			await route.fulfill({ json: franchiseRes });
		} else if (method === "POST") {
			// Create franchise logic...
		} else {
			await route.continue();
		}
	});

	// 2. User-specific franchise endpoint (for franchisees/admins)
	await page.route(/\/api\/franchise\/\d+$/, async (route) => {
		const method = route.request().method();
		const url = route.request().url();

		if (method === "GET") {
			const match = url.match(/\/api\/franchise\/(\d+)$/);
			if (match) {
				const userId = parseInt(match[1]);

				if (userId === 2) {
					// franchisee f@jwt.com
					await route.fulfill({
						json: [
							{
								id: 1,
								name: "pizzaPocket",
								admins: [
									{
										id: 2,
										name: "Chein Kai",
										email: "f@jwt.com",
									},
								],
								stores: [
									{
										id: 1,
										name: "SLC",
										totalRevenue: 1000,
									},
									{
										id: 3,
										name: "Provo",
										totalRevenue: 1500,
									},
								],
							},
						],
					});
				} else if (userId === 4) {
					// admin e@jwt.com
					await route.fulfill({
						json: [
							{
								id: 3,
								name: "PizzaCorp",
								admins: [{ id: 4, email: "e@jwt.com" }],
								stores: [{ id: 7, name: "Spanish Fork", totalRevenue: 1200 }],
							},
						],
					});
				} else {
					// Regular users don't own franchises
					await route.fulfill({ json: [] });
				}
			}
		} else {
			await route.continue();
		}
	});

	// Order a pizza.
	await page.route("*/**/api/order", async (route) => {
		const orderReq = route.request().postDataJSON();
		const orderRes = {
			order: { ...orderReq, id: 23 },
			jwt: "eyJpYXQ",
		};
		await route.fulfill({ json: orderRes });
	});

	// POST /api/franchise/:franchiseId/store - Create store
	await page.route(/\/api\/franchise\/\d+\/store$/, async (route) => {
		const method = route.request().method();
		const url = route.request().url();

		if (method === "POST") {
			const match = url.match(/\/api\/franchise\/(\d+)\/store$/);
			if (match) {
				const franchiseId = parseInt(match[1]);
				const franchise = franchises.find((f) => f.id === franchiseId);

				if (!franchise) {
					await route.fulfill({ status: 404 });
					return;
				}

				// Only allow franchisees to access this
				if (!loggedInUser?.roles?.some((r) => r.role === Role.Franchisee)) {
					await route.fulfill({
						status: 403,
						json: { error: "Not a franchisee" },
					});
					return;
				}

				const data = route.request().postDataJSON();
				const newStore = {
					id: franchise.stores.length + 1,
					name: data.name,
					totalRevenue: 0,
				};

				franchise.stores.push(newStore);
				await route.fulfill({ json: newStore });
				return;
			}
		}
		await route.continue();
	});

	// DELETE /api/franchise/:franchiseId - Delete franchise
	await page.route(/\/api\/franchise\/\d+$/, async (route) => {
		const method = route.request().method();
		const url = route.request().url();

		if (method === "DELETE") {
			const match = url.match(/\/api\/franchise\/(\d+)$/);
			if (match) {
				const franchiseId = parseInt(match[1]);
				if (
					!loggedInUser ||
					!loggedInUser.roles?.some((r) => r.role === Role.Admin)
				) {
					await route.fulfill({
						status: 403,
						json: { error: "Only admins can delete franchises" },
					});
					return;
				}
				const franchiseIndex = franchises.findIndex(
					(f) => f.id === franchiseId,
				);
				if (franchiseIndex === -1) {
					await route.fulfill({ status: 404 });
					return;
				}
				franchises.splice(franchiseIndex, 1);

				await route.fulfill({
					json: { message: "franchise deleted" },
				});
				return;
			}
		}
		await route.continue();
	});

	await page.goto("/");
}

test("login and logout", async ({ page }) => {
	await basicInit(page);
	await login(page, "d@jwt.com", "a");
	await expect(page.getByRole("link", { name: "KC" })).toBeVisible();
	await page.getByRole("link", { name: "Logout" }).click();
});

test("Register", async ({ page }) => {
	await basicInit(page);
	await page.getByRole("link", { name: "Register" }).click();
	await page.getByRole("textbox", { name: "Full name" }).click();
	await page.getByRole("textbox", { name: "Full name" }).fill("mrPizza");
	await page.getByRole("textbox", { name: "Email address" }).click();
	await page
		.getByRole("textbox", { name: "Email address" })
		.fill("mrPizza@jwt.com");
	await page.getByRole("textbox", { name: "Password" }).click();
	await page.getByRole("textbox", { name: "Password" }).fill("1234");
	await page.getByRole("button", { name: "Register" }).click();
});

test("bogus login", async ({ page }) => {
	await basicInit(page);
	await login(page, "sdfs", "fgh");
});

test("purchase with login", async ({ page }) => {
	await basicInit(page);

	// Go to order page
	await page.getByRole("button", { name: "Order now" }).click();

	// Create order
	await expect(page.locator("h2")).toContainText("Awesome is a click away");
	await page.getByRole("combobox").selectOption("4");
	await page.getByRole("link", { name: "Image Description Veggie A" }).click();
	await page.getByRole("link", { name: "Image Description Pepperoni" }).click();
	await expect(page.locator("form")).toContainText("Selected pizzas: 2");
	await page.getByRole("button", { name: "Checkout" }).click();

	// Login
	await page.getByPlaceholder("Email address").click();
	await page.getByPlaceholder("Email address").fill("d@jwt.com");
	await page.getByPlaceholder("Email address").press("Tab");
	await page.getByPlaceholder("Password").fill("a");
	await page.getByRole("button", { name: "Login" }).click();

	// Pay
	await expect(page.getByRole("main")).toContainText(
		"Send me those 2 pizzas right now!",
	);
	await expect(page.locator("tbody")).toContainText("Veggie");
	await expect(page.locator("tbody")).toContainText("Pepperoni");
	await expect(page.locator("tfoot")).toContainText("0.008 ₿");
	await page.getByRole("button", { name: "Cancel" }).click();
	await page.getByRole("button", { name: "Checkout" }).click();
	await page.getByRole("button", { name: "Pay now" }).click();
	await page.getByRole("button", { name: "Order more" }).click();

	// Check balance
	await expect(page.locator("h2")).toContainText("Awesome is a click away");
});

test("create franchise", async ({ page }) => {
	await basicInit(page);
	await login(page, "e@jwt.com", "b");
	await page.getByRole("link", { name: "Admin" }).click();
	await page.getByRole("button", { name: "Add Franchise" }).click();
	await page.getByRole("textbox", { name: "franchise name" }).click();
	await page.getByRole("textbox", { name: "franchise name" }).fill("mrPizza");
	await page.getByRole("textbox", { name: "franchisee admin email" }).click();
	await page
		.getByRole("textbox", { name: "franchisee admin email" })
		.fill("mrPizza@jwt.com");
	await page.getByRole("button", { name: "Create" }).click();
});

test("store creation", async ({ page }) => {
	await page.route("*/**/api/auth", async (route) => {
		const loginReq = { email: "f@jwt.com", password: "f" };
		const loginRes = {
			user: {
				id: 3,
				name: "Kai Chen",
				email: "f@jwt.com",
				roles: [{ role: "diner" }, { objectId: 8, role: "franchisee" }],
			},
			token: "abcdef",
		};
		expect(route.request().method()).toBe("PUT");
		expect(route.request().postDataJSON()).toMatchObject(loginReq);
		await route.fulfill({ json: loginRes });
	});

	await page.route("*/**/api/franchise/3", async (route) => {
		const franchiceRes = [
			{
				id: 8,
				name: "provo",
				admins: [
					{
						id: 3,
						name: "mrPizzaJohn",
						email: "f@jwt.com",
					},
				],
				stores: [
					{
						id: 304,
						name: "BoyDinner",
						totalRevenue: 0.05,
					},
				],
			},
		];
		expect(route.request().method()).toBe("GET");
		await route.fulfill({ json: franchiceRes });
	});

	await page.route("*/**/api/franchise/8/store", async (route) => {
		const storeReq = {
			id: "",
			name: "Store",
		};
		const storeRes = { id: 5, franchiseId: 8, name: "store" };
		expect(route.request().method()).toBe("POST");
		expect(route.request().postDataJSON()).toMatchObject(storeReq);
		await route.fulfill({ json: storeRes });
	});

	await page.route("*/**/api/franchise/8/store/304", async (route) => {
		const storeRes = { message: "store deleted" };
		expect(route.request().method()).toBe("DELETE");
		await route.fulfill({ json: storeRes });
	});

	await page.goto("/");
	await login(page, "f@jwt.com", "f");
	await page
		.getByLabel("Global")
		.getByRole("link", { name: "Franchise" })
		.click();

	await page
		.getByRole("row", { name: "BoyDinner 0.05 ₿ Close" })
		.getByRole("button")
		.click();
	await page.getByRole("button", { name: "Close" }).click();

	await page.getByRole("button", { name: "Create store" }).click();
	await page.getByRole("textbox", { name: "store name" }).click();
	await page.getByRole("textbox", { name: "store name" }).fill("Store");
	await page.getByRole("button", { name: "Create" }).click();
});
test("close franchise", async ({ page }) => {
	await basicInit(page);
	await login(page, "e@jwt.com", "b");
	await page.getByRole("link", { name: "Admin" }).click();
});

test("close franchise as admin", async ({ page }) => {
	await basicInit(page);
	await login(page, "e@jwt.com", "b"); // Log in as admin
	await page.getByRole("link", { name: "Admin" }).click();

	await page.waitForTimeout(1000);
	const pizzaCorpRow = page.locator("tr", { hasText: "PizzaCorp" });
	await pizzaCorpRow.getByRole("button", { name: /delete|close/i }).click();

	if (await page.getByRole("button", { name: /confirm|yes/i }).isVisible()) {
		await page.getByRole("button", { name: /confirm|yes/i }).click();
	}

	await expect(page.locator("tr", { hasText: "PizzaCorp" })).not.toBeVisible();
});

test("franchise, about, and history", async ({ page }) => {
	await basicInit(page);
	await page.getByRole("link", { name: "Franchise" }).nth(1).click();
	await page.getByRole("link", { name: "About" }).click();
	await page.getByRole("link", { name: "History" }).click();
});

test("updateUser", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("link", { name: "Register" }).click();
	await page.getByRole("textbox", { name: "Full name" }).fill("pizza diner");
	await page
		.getByRole("textbox", { name: "Email address" })
		.fill("beans@jwt.com");
	await page.getByRole("textbox", { name: "Password" }).fill("diner");
	await page.getByRole("button", { name: "Register" }).click();
	await page.getByRole("link", { name: "pd" }).click();
	await expect(page.getByRole("main")).toContainText("pizza diner");

	await page.getByRole("button", { name: "Edit" }).click();
	await expect(page.locator("h3")).toContainText("Edit user");
	await page.getByRole("textbox").first().fill("pizza dinerx");
	await page.getByRole("button", { name: "Update" }).click();
	await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });
	await expect(page.getByRole("main")).toContainText("pizza dinerx");

	await page.getByRole("button", { name: "Edit" }).click();
	await expect(page.locator("h3")).toContainText("Edit user");
	await page.getByRole("textbox").last().fill("derpSauce");
	await page.getByRole("button", { name: "Update" }).click();
	await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });
	await expect(page.getByRole("main")).toContainText("pizza dinerx");

	await page.getByRole("button", { name: "Edit" }).click();
	await expect(page.locator("h3")).toContainText("Edit user");
	await page.getByRole("textbox").nth(1).fill("moreBeans@jwt.com");
	await page.getByRole("button", { name: "Update" }).click();
	await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });
	await expect(page.getByRole("main")).toContainText("pizza dinerx");

	await page.getByRole("link", { name: "Logout" }).click();
	await login(page, "moreBeans@jwt.com", "derpSauce");
	await page.getByRole("link", { name: "pd" }).click();
	await expect(page.getByRole("main")).toContainText("pizza dinerx");
});

//Make sure jwt-pizza-service is running
test("updateAdmin", async ({ page }) => {
	await page.goto("/");
	await login(page, "a@jwt.com", "admin");
	await page.getByRole("link", { name: "j" }).click();
	await page.getByRole("button", { name: "Edit" }).click();
	await expect(page.locator("h3")).toContainText("Edit user");
	await page.getByRole("textbox").last().fill("sauce");
	await page.getByRole("button", { name: "Update" }).click();
	await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

	await page.getByRole("link", { name: "Logout" }).click();
	await login(page, "a@jwt.com", "sauce");

	await page.getByRole("link", { name: "j" }).click();
	await page.getByRole("button", { name: "Edit" }).click();
	await expect(page.locator("h3")).toContainText("Edit user");
	await page.getByRole("textbox").last().fill("admin");
	await page.getByRole("button", { name: "Update" }).click();
	await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

	await page.getByRole("link", { name: "Logout" }).click();
	await login(page, "a@jwt.com", "admin");
	await page.getByRole("link", { name: "Logout" }).click();
});

//Make sure jwt-pizza-service is running
test("updateFranchisee", async ({ page }) => {
	await page.goto("/");
	await login(page, "f@jwt.com", "franchisee");
	await page.getByRole("link", { name: "pf" }).click();
	await page.getByRole("button", { name: "Edit" }).click();
	await expect(page.locator("h3")).toContainText("Edit user");
	await page.getByRole("textbox").last().fill("sauce");
	await page.getByRole("button", { name: "Update" }).click();
	await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

	await page.getByRole("link", { name: "Logout" }).click();
	await login(page, "f@jwt.com", "sauce");

	await page.getByRole("link", { name: "pf" }).click();
	await page.getByRole("button", { name: "Edit" }).click();
	await expect(page.locator("h3")).toContainText("Edit user");
	await page.getByRole("textbox").last().fill("franchisee");
	await page.getByRole("button", { name: "Update" }).click();
	await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

	await page.getByRole("link", { name: "Logout" }).click();
	await login(page, "f@jwt.com", "franchisee");
	await page.getByRole("link", { name: "Logout" }).click();
});

async function login(page: Page, email: string, password: string) {
	await page.getByRole("link", { name: "Login" }).click();
	await page.getByRole("textbox", { name: "Email address" }).fill(email);
	await page.getByRole("textbox", { name: "Password" }).fill(password);
	await page.getByRole("button", { name: "Login" }).click();
}
