🚀 RouteRecover AI

AI-Powered Travel Disruption Recovery & Intelligent Rerouting Platform

Sahyadri DevHost 2026 / Synergia 26 Hackathon
Problem Statement 4.1 | Team QuadCoders

RouteRecover AI is an intelligent travel recovery platform designed to help travellers recover from unexpected disruptions such as cancelled flights, missed connections, and major delays. Instead of forcing users to manually search for alternatives, the platform helps them explore recovery options based on their schedule, budget, destination, and personal constraints.

🌐 Live Demo: https://route-recover-ai.vercel.app/
💻 GitHub Repository: https://github.com/abhisheksuvarna782-coder/ROUTE_RECOVER_AI

---

📌 1. Problem Statement

Travel disruptions can turn a planned journey into a stressful and expensive experience. When a flight is cancelled or delayed, travellers often have to search across multiple websites and services to find alternative flights, trains, buses, accommodation, and transportation.

The challenge becomes more difficult when travellers have strict arrival deadlines, existing hotel reservations, connecting journeys, or limited budgets.

❌ Existing Challenges

- Cancelled or delayed flights disrupt the entire travel itinerary.
- Finding alternative transportation requires checking multiple platforms.
- Travellers may miss hotel check-ins, events, meetings, or connecting journeys.
- Alternative routes can exceed the traveller's budget.
- Travellers must manually compare complicated travel options.
- Recovery decisions need to consider several constraints simultaneously.

💡 Our Solution

RouteRecover AI transforms travel disruption into a structured recovery process.

The platform helps travellers organise their trip information, identify disruptions, evaluate alternative travel options, and explore recovery plans that consider their budget, deadlines, and other travel constraints.

---

🌟 2. What Makes RouteRecover AI Different?

RouteRecover AI focuses on constraint-aware travel recovery rather than simply suggesting alternative routes.

A recovery option should not be considered suitable merely because it reaches the destination. It should also account for the traveller's real-world requirements.

For example, a route that arrives after an important deadline may not be useful, even if it is inexpensive.

Key Innovation

- Constraint-Aware Planning: Considers travel deadlines, budgets, and itinerary requirements.
- AI-Assisted Recovery: Uses AI-oriented logic to support the recovery planning process.
- Centralised Recovery Workspace: Organises disruption details and possible recovery actions in one place.
- Budget-Conscious Decisions: Helps travellers evaluate options against their maximum additional spending limit.
- Deadline-Focused Planning: Prioritises the traveller's required arrival time.
- User-Centred Experience: Presents travel disruption information through a structured interface.

---

🧠 3. How It Works

flowchart TD
    A[Traveller Opens RouteRecover AI] --> B[Create or Select Trip]
    B --> C[Enter Trip Details and Constraints]
    C --> D[Report or Identify Travel Disruption]
    D --> E[Analyse Recovery Requirements]
    E --> F[Evaluate Alternative Recovery Options]
    F --> G[Apply Budget and Deadline Constraints]
    G --> H[Present Recovery Recommendations]
    H --> I[Traveller Reviews Available Options]
    I --> J[Choose a Suitable Recovery Plan]

Workflow Explanation

1. Trip Setup: The traveller enters or selects their trip details.
2. Constraint Collection: Relevant requirements, including deadlines and spending limits, are recorded.
3. Disruption Handling: The disruption is documented in the recovery workflow.
4. Requirement Analysis: The system evaluates the traveller's recovery needs.
5. Alternative Evaluation: Possible travel recovery options are considered.
6. Constraint Checking: Options are assessed against the traveller's requirements.
7. Recommendation: The platform presents recovery information for the traveller to review.
8. Decision: The traveller selects an appropriate recovery plan.

Actual recommendations depend on the application's implemented functionality and the availability of reliable travel information.

---

🏗️ 4. System Architecture

RouteRecover AI uses a web-based architecture with a frontend, backend, data layer, and AI-assisted recovery functionality.

flowchart TB
    U[Traveller] --> FE[React Frontend]
    FE --> API[FastAPI Backend]
    API --> REC[Recovery Logic]
    API --> AI[AI Integration]
    API --> DB[(SQLite Database)]
    REC --> API
    AI --> API
    API --> FE
    FE --> OUT[Recovery Results and Workspace]

Architecture Components

Component| Technology| Purpose
Frontend| React.js| User interface and interactive components
Programming Language| TypeScript| Type-safe frontend development
Build Tool| Vite| Frontend development and production builds
Styling| Tailwind CSS| Responsive interface styling
API Communication| Axios| HTTP communication with backend services
Routing| React Router| Frontend navigation
Backend| Python FastAPI| API endpoints and backend operations
Data Validation| Pydantic| Request and response validation
ORM| SQLAlchemy| Database interaction
Database| SQLite| Persistent data storage
Deployment| Vercel| Live frontend deployment

Note: The architecture reflects the project's intended technology structure. Verify the current source code and configuration before treating every component as part of the deployed production system.

---

✨ 5. Key Features

📊 Dashboard

Provides a central place to access travel information and recovery-related functionality.

🧳 Trip Management

Organises trip details so travellers can manage their journeys within the application.

🚨 Disruption Centre

Provides a workflow for recording and handling travel disruptions, such as cancelled or delayed flights.

🤖 AI-Assisted Recovery

Supports recovery planning by analysing travel requirements and helping evaluate possible alternatives.

🗺️ Recovery Workspace

Brings relevant disruption information and recovery options together in a structured workspace.

⚙️ Traveller Constraints

Supports planning around requirements such as:

- Maximum additional spending
- Required arrival time
- Destination and travel preferences
- Existing itinerary commitments

The constraints available in the interface depend on the current implementation.

📜 Recovery History

Helps organise previously recorded recovery activity where supported by the application.

💬 AI Assistant

Provides an interface for AI-assisted travel recovery guidance, subject to the functionality configured in the project.

📱 Responsive Interface

Designed to provide a usable experience across different screen sizes.

---

🎯 6. Demonstration Scenario

Scenario: Cancelled Mangaluru–Bengaluru Flight

Imagine a traveller whose IndiGo flight from Mangaluru to Bengaluru has been cancelled unexpectedly.

The traveller has several commitments:

Requirement| Details
Original Journey| Mangaluru → Bengaluru
Disruption| Flight cancellation
Airline| IndiGo
Hotel Reservation| The Leela
Next Journey| Train to Mysuru
Train Departure| 5:00 PM
Required Arrival Deadline| 4:00 PM
Maximum Additional Spending| ₹1,500

The Challenge

The traveller must reach Bengaluru before 4:00 PM to manage the onward journey and existing plans. The traveller also wants to keep additional recovery expenses within ₹1,500.

A replacement flight may be expensive or unavailable. A train or bus may be more affordable but might not arrive before the deadline.

How RouteRecover AI Helps

1. The traveller records the cancelled flight.
2. The relevant destination, deadline, and spending limit are entered.
3. The recovery workflow evaluates the traveller's requirements.
4. Possible alternatives can be reviewed against the time and budget constraints.
5. The traveller compares the available options and chooses a suitable plan.

Expected Outcome

RouteRecover AI aims to reduce the time and effort required to plan a response to a travel disruption by organising the recovery process around the traveller's actual needs.

Important: The example is a demonstration scenario, not a claim that live transport inventory, fares, bookings, or arrival times are automatically verified by the current application.

---

🛠️ 7. Technology Stack

Frontend

- React.js
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router

Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy

Database

- SQLite

Development and Deployment

- Git
- GitHub
- Node.js and npm
- Python virtual environments
- Vercel

AI and Recovery Logic

- AI-assisted recovery planning
- Constraint-aware decision support
- Structured evaluation of travel requirements

The exact AI provider, model, external travel APIs, and live data sources should be documented once confirmed in the repository configuration.

---

⚙️ 8. Installation and Setup

Follow these instructions to run the project locally.

Prerequisites

Install the following tools:

- Git
- Node.js and npm
- Python 3
- A code editor such as Visual Studio Code

Step 1: Clone the Repository

git clone https://github.com/abhisheksuvarna782-coder/ROUTE_RECOVER_AI.git

Navigate into the project directory:

cd ROUTE_RECOVER_AI

Step 2: Set Up the Backend

Locate the backend directory in the repository:

cd backend

Create a Python virtual environment:

python -m venv .venv

Activate it.

Windows:

.venv\Scripts\activate

macOS/Linux:

source .venv/bin/activate

Install the backend dependencies if a "requirements.txt" file exists:

pip install -r requirements.txt

Start the backend using the application's actual FastAPI entry point. For example, if the entry point is "app.main:app", use:

uvicorn app.main:app --reload --port 8000

The entry-point path may differ depending on the repository structure.

Step 3: Set Up the Frontend

Open a new terminal and navigate to the frontend directory:

cd ROUTE_RECOVER_AI/frontend

Install dependencies:

npm install

Start the development server:

npm run dev

Vite will display the local development URL in the terminal.

Step 4: Configure Frontend and Backend Communication

If the frontend communicates with a locally running backend, configure the API base URL using the environment variable or configuration mechanism expected by the application.

For example, a Vite application may use:

VITE_API_BASE_URL=http://localhost:8000

Important: Use the variable name expected by the project's source code. Do not add this variable blindly if the application uses a different configuration method.

Setup Notes

The directory names, dependency files, FastAPI entry point, and environment variable names above are examples to verify against the actual repository. Follow the existing project configuration if it differs.

---

🌐 9. Live Demo and Repository

Explore the project through the following links:

- Live Application: https://route-recover-ai.vercel.app/
- GitHub Repository: https://github.com/abhisheksuvarna782-coder/ROUTE_RECOVER_AI

The live link provides access to the deployed frontend. Backend-dependent features may require a separately configured backend service.

---

🔐 10. Reliability and Limitations

Travel recovery decisions can affect a traveller's money, schedule, and onward commitments. Recommendations should therefore be evaluated carefully.

Current Considerations

- The quality of recovery recommendations depends on the accuracy of the available travel information.
- Live fares, seat availability, and transport schedules must be verified with reliable sources.
- Estimated arrival times should not be treated as guaranteed.
- AI-generated recommendations may need human verification.
- The application should clearly distinguish verified information from estimates.
- Booking, cancellation, or payment actions should not be assumed to occur automatically unless explicitly implemented.

Future Reliability Improvements

- Integrate verified flight, train, and bus information sources.
- Validate alternative routes against the traveller's deadline.
- Display estimated total cost and additional spending.
- Explain why each recovery option is recommended.
- Provide fallback recommendations when the preferred option is unavailable.
- Add clear indicators for stale, estimated, or unverified information.

---

🚀 11. Future Enhancements

Potential improvements to RouteRecover AI include:

- Live Travel API Integration: Retrieve up-to-date transport schedules, fares, and availability.
- Intelligent Multimodal Routing: Combine flights, trains, buses, and other transport options.
- Advanced Constraint Optimisation: Rank recovery plans using budget, arrival time, convenience, and traveller preferences.
- Real-Time Disruption Monitoring: Detect relevant disruptions through reliable external data sources.
- Personalised Recovery Recommendations: Tailor suggestions to the traveller's itinerary and requirements.
- Notifications and Alerts: Notify users when relevant disruptions or recovery opportunities arise.
- Multilingual Support: Make the application more accessible to travellers who prefer different languages.
- Mobile-Friendly Experience: Improve access from smartphones and other devices.
- Recovery Cost Estimation: Compare the estimated additional expense of alternative plans.
- Explainable AI Recommendations: Show the reasons behind recommendations and identify trade-offs.
- Booking Integration: Support external booking workflows where reliable integrations are available.

---

👨‍💻 12. Team QuadCoders

Developed by Team QuadCoders for Sahyadri DevHost 2026 / Synergia 26 Hackathon at A.J. Institute of Engineering and Technology, Mangaluru.

Team Member| Role| Responsibilities
Abhishek Suvarna| Team Lead, Backend & AI| Team coordination, backend development, AI integration, and recovery logic
Rishitha R| Frontend Developer| User interface development, frontend components, and user experience
Ajay Raj A N| Core Integration| Integration of core modules, frontend-backend connectivity, and system integration
Ritu R Suvarna| Research & Documentation| Problem research, solution documentation, technical documentation, and project presentation

🔗 Team Lead Links

- GitHub: https://github.com/abhisheksuvarna782-coder
- LinkedIn: https://www.linkedin.com/in/abhishek-suvarna-1bb2b6335/

🏛️ Project Information

Detail| Information
Project Name| RouteRecover AI
Team Name| QuadCoders
Institution| A.J. Institute of Engineering and Technology
Location| Mangaluru, Karnataka, India
Hackathon| Sahyadri DevHost 2026 / Synergia 26
Problem Statement| 4.1

---

🤝 13. Contributing

Contributions, feedback, and suggestions are welcome.

To propose an improvement:

1. Fork the repository.
2. Create a feature branch.
3. Implement and test your changes.
4. Commit your changes with a descriptive message.
5. Open a pull request describing the improvement.

---

📄 14. License

No specific open-source license is declared here. If you intend to distribute or reuse the project publicly, add an appropriate "LICENSE" file to the repository.

---

⭐ Support the Project

If you find RouteRecover AI interesting, consider visiting the repository, exploring the implementation, and sharing your feedback.

RouteRecover AI — Smarter decisions when travel plans go wrong. ✈️