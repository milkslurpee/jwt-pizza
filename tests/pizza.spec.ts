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
	};

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
		}
	});

	// Return the currently logged in user
	await page.route("*/**/api/user/me", async (route) => {
		expect(route.request().method()).toBe("GET");
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
		expect(route.request().method()).toBe("GET");
		await route.fulfill({ json: menuRes });
	});

	// Standard franchises and stores
	await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
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
				{ id: 3, name: "PizzaCorp", stores: [{ id: 7, name: "Spanish Fork" }] },
				{ id: 4, name: "topSpot", stores: [] },
			],
		};
		expect(route.request().method()).toBe("GET");
		await route.fulfill({ json: franchiseRes });
	});

	// Order a pizza.
	await page.route("*/**/api/order", async (route) => {
		const orderReq = route.request().postDataJSON();
		const orderRes = {
			order: { ...orderReq, id: 23 },
			jwt: "eyJpYXQ",
		};
		expect(route.request().method()).toBe("POST");
		await route.fulfill({ json: orderRes });
	});

	//Create a new Franchise
	await page.route("*/**/api/franchise", async (route) => {
		const FranchReq = route.request().postDataJSON();
		const franchiseRes = {
			id: 75, // fake ID for the new franchise
			name: FranchReq.name,
			admins: FranchReq.admins.map((a: any, i: number) => ({
				id: i + 1, // mock IDs for admins
				email: a.email,
				name: a.name || a.email, // fallback name
			})),
		};
		expect(route.request().method()).toBe("POST");
		await route.fulfill({ json: franchiseRes });
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
	await page.getByRole("button", { name: "Pay now" }).click();

	// Check balance
	await expect(page.getByText("0.008")).toBeVisible();
});

test("create and delete franchise", async ({ page }) => {
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

test("Franchise About and History", async ({ page }) => {
	await basicInit(page);
	await page.getByRole("link", { name: "Franchise" }).nth(1).click();
	await page.getByRole("link", { name: "About" }).click();
	await page.getByRole("link", { name: "History" }).click();
});

async function login(page: Page, email: string, password: string) {
	await page.getByRole("link", { name: "Login" }).click();
	await page.getByRole("textbox", { name: "Email address" }).fill(email);
	await page.getByRole("textbox", { name: "Password" }).fill(password);
	await page.getByRole("button", { name: "Login" }).click();
}
