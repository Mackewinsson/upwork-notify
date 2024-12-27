const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
    {
        url: { type: String, required: true }, // Scraping target URL
        interval: { type: Number, default: 15 }, // Interval in minutes
        lastRun: { type: Date, default: null }, // Last time the task ran
        notifiedJobUids: [String], // Array of job UUIDs already notified for this task
    },
    {
        timestamps: true,
    }
);

const UserSchema = new mongoose.Schema(
    {
        name: String,
        age: Number,
        given_name: String,
        nickname: String,
        picture: String,
        locale: String,
        updated_at: Date,
        email: String,
        email_verified: Boolean,
        sub: String,
        sid: String,
        subscriptionType: {
            type: String,
            enum: ["free", "pro"],
            default: "free",
        },
        tasks: [TaskSchema], // Embedded array of tasks
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
