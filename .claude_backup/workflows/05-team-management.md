# 🤝 Team Management Workflow

Use this workflow to effectively manage the AiTut Agent Team.

## 🚀 Initializing the Team

To start a new collaborative effort, use a prompt like:
> "Create an agent team for [Feature/Task]. I want a Lead, a Frontend Specialist, and a Backend Specialist to collaborate on this."

### Recommended Setup Command (Terminal)
Ensure you are in the project root:
```powershell
claude --teammate-mode in-process
```
*Note: If you have `tmux` installed on Windows (via WSL), you can use it for better pane management.*

## 📋 Interaction Protocol

1. **Task Breakdown**: The Lead agent will create several tasks in the shared list (`Ctrl + T`).
2. **Claiming Tasks**: Teammates will pick up unblocked tasks that match their roles.
3. **Collaboration**: Teammates will talk to each other to clarify API contracts and UI needs.
4. **Handovers**: When a backend task is done, the Backend Specialist updates the task list, unblocking the Frontend Specialist.
5. **Review**: The Lead agent reviews the final outcome before reporting back.

## 🔄 Switching Contexts
If the team gets stuck or needs a different specialty (e.g., QA), you can say:
> "Add a QA specialist to the team to review the current implementation and add tests."
