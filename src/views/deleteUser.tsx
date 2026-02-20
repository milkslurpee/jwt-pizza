import React from "react";
import { useLocation } from "react-router-dom";
import { pizzaService } from "../service/service";
import View from "./view";
import Button from "../components/button";
import { useBreadcrumb } from "../hooks/appNavigation";

export default function DeleteUser() {
	const state = useLocation().state;
	const user = state?.user;
	const navigateToParentPath = useBreadcrumb();

	async function remove() {
		console.log("Deleting user", user);
		await pizzaService.deleteUser(user);
		navigateToParentPath();
	}

	return (
		<View title="Are you Sure?">
			<div className="text-start py-8 px-4 sm:px-6 lg:px-8">
				<div className="text-neutral-100">
					Are you sure you want to delete the user:{" "}
					<span className="text-orange-500">{user.name}</span>?
				</div>
				<Button title="Delete" onPress={remove} />
				<Button
					title="Cancel"
					onPress={navigateToParentPath}
					className="bg-transparent border-neutral-300"
				/>
			</div>
		</View>
	);
}
