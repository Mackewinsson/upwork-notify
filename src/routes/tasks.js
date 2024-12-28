const express = require("express");
const router = express.Router();
const User = require("../db/models/user");

// Add a new task for a user
router.post("/:userId/tasks", async (req, res) => {
    const { userId } = req.params;
    const { url, interval, webhookUrl } = req.body;
    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if user has reached their max task limit
        if (user.tasks.length >= user.subscriptionLimits.maxTasks) {
            return res.status(403).json({ error: "Task limit exceeded for your current subscription" });
        }

        // Validate webhookUrl
        if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
            return res.status(400).json({ error: "Invalid Slack webhook URL" });
        }

        // Create a new task
        const newTask = {
            url,
            interval,
            webhookUrl, // Include webhookUrl in the task data
            notifiedJobUids: [], // Initialize as empty
        };

        user.tasks.push(newTask);
        await user.save();

        res.status(201).json({ message: "Task added successfully", task: newTask });
    } catch (error) {
        console.error("Error adding task:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Fetch all tasks for a user
router.get("/:userId/tasks", async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ tasks: user.tasks });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update a task
router.put("/:userId/tasks/:taskId", async (req, res) => {
    const { userId, taskId } = req.params;
    const { url, interval } = req.body;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const task = user.tasks.id(taskId);

        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        // Validate interval for the update
        if (interval && interval < user.subscriptionLimits.minInterval) {
            return res.status(400).json({
                error: `Interval too short. Minimum allowed: ${user.subscriptionLimits.minInterval} minutes.`,
            });
        }

        // Update the task fields
        if (url) task.url = url;
        if (interval) task.interval = interval;

        await user.save();

        res.status(200).json({ message: "Task updated successfully", task });
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Delete a task
router.delete("/:userId/tasks/:taskId", async (req, res) => {
    const { userId, taskId } = req.params;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const task = user.tasks.id(taskId);

        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        // Use pull to remove the task by ID
        user.tasks.pull(taskId);
        await user.save();

        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
