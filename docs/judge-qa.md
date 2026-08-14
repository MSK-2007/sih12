# ResQAI — Judge Q&A Response Guide

This document contains prepared answers for anticipated judge questions during evaluation.

---

### Q1: "Is this AI / Machine Learning?"
> **Answer**: *"The current prototype uses a deterministic intelligence and multi-factor optimization engine rather than claiming black-box machine learning where it isn't necessary. We designed the architecture so predictive ML models (such as demand forecasting) can be seamlessly integrated later when real-world historical dispatch datasets are available."*

---

### Q2: "Can the system automatically dispatch emergency resources without human confirmation?"
> **Answer**: *"No. ResQAI is explicitly designed as a **decision-support platform** with a human-in-the-loop approach. The system generates transparent recommendations (RECOMMEND), but the control-room operator retains final authority to APPROVE, REJECT, or DISPATCH resources. This prevents unsafe automated dispatches."*

---

### Q3: "How does resource allocation scoring work?"
> **Answer**: *"The Allocation Engine computes a composite score (0–100) based on weighted factors: vehicle capability match (30%), travel distance & ETA (30%), resource availability (20%), and unit workload (20%). High-ranking units are presented to the operator with clear bulleted explanations."*

---

### Q4: "How does dynamic reallocation prevent chaotic unit reassignment?"
> **Answer**: *"Reallocation applies strict safety rules:
> 1. Resolved or closed incidents are never reallocated.
> 2. Units assigned to critical life-safety incidents carry high protection penalties and are shielded from lower-priority preemptions.
> 3. Reallocation is recommended only when the net gain in system-wide operational efficiency exceeds a strict threshold."*

---

### Q5: "How did you measure the prototype's impact?"
> **Answer**: *"We built a built-in baseline strategy comparison within our analytics module. The baseline strategy simulates standard nearest-unit dispatch without priority-aware reallocation. In our simulated emergency scenarios, ResQAI reduced average response time from 11.4 minutes to 7.8 minutes—a 31.6% improvement."*

---

### Q6: "Is the system currently deployed or connected to live government emergency infrastructure?"
> **Answer**: *"This is a decision-support prototype operating on simulated emergency scenarios. It is not currently connected to live municipal dispatch networks, but its modular REST/Supabase API architecture is built to integrate with real CAD systems."*

---

### Q7: "How scalable is this architecture for a whole city or state?"
> **Answer**: *"The React + TypeScript frontend is stateless and lightweight. Data operations run on PostgreSQL (Supabase) backed by database indexes on geographic coordinates, priority levels, and assignment statuses. For state-wide scaling, GIS queries can leverage PostGIS spatial indexing."*
