const questionBank = {
  'Backend Developer': [
    // ── Easy ──
    { id: 'be-e1', question: 'What is a REST API and how does it differ from SOAP?', difficulty: 'easy', category: 'Backend Developer' },
    { id: 'be-e2', question: 'Explain the difference between SQL and NoSQL databases.', difficulty: 'easy', category: 'Backend Developer' },
    { id: 'be-e3', question: 'What is middleware in a web application?', difficulty: 'easy', category: 'Backend Developer' },
    { id: 'be-e4', question: 'What are HTTP status codes? Name a few common ones and their meanings.', difficulty: 'easy', category: 'Backend Developer' },
    { id: 'be-e5', question: 'What is the difference between authentication and authorization?', difficulty: 'easy', category: 'Backend Developer' },
    { id: 'be-e6', question: 'Explain what CRUD operations are.', difficulty: 'easy', category: 'Backend Developer' },
    { id: 'be-e7', question: 'What is JSON and why is it commonly used in APIs?', difficulty: 'easy', category: 'Backend Developer' },
    { id: 'be-e8', question: 'What is the purpose of environment variables in backend applications?', difficulty: 'easy', category: 'Backend Developer' },

    // ── Medium ──
    { id: 'be-m1', question: 'Explain dependency injection and its benefits in backend development.', difficulty: 'medium', category: 'Backend Developer' },
    { id: 'be-m2', question: 'What is database indexing and how does it improve query performance?', difficulty: 'medium', category: 'Backend Developer' },
    { id: 'be-m3', question: 'Describe the differences between monolithic and microservices architecture.', difficulty: 'medium', category: 'Backend Developer' },
    { id: 'be-m4', question: 'What is connection pooling and why is it important?', difficulty: 'medium', category: 'Backend Developer' },
    { id: 'be-m5', question: 'Explain the concept of caching and where you would apply it in a backend system.', difficulty: 'medium', category: 'Backend Developer' },
    { id: 'be-m6', question: 'What are database transactions and what does ACID stand for?', difficulty: 'medium', category: 'Backend Developer' },
    { id: 'be-m7', question: 'How would you implement rate limiting in an API?', difficulty: 'medium', category: 'Backend Developer' },
    { id: 'be-m8', question: 'What is the Repository pattern and why is it useful?', difficulty: 'medium', category: 'Backend Developer' },

    // ── Hard ──
    { id: 'be-h1', question: 'How would you design a scalable notification system that handles millions of users?', difficulty: 'hard', category: 'Backend Developer' },
    { id: 'be-h2', question: 'Explain eventual consistency and how it applies to distributed databases.', difficulty: 'hard', category: 'Backend Developer' },
    { id: 'be-h3', question: 'What is the CAP theorem and how does it influence system design decisions?', difficulty: 'hard', category: 'Backend Developer' },
    { id: 'be-h4', question: 'How would you handle distributed transactions across multiple microservices?', difficulty: 'hard', category: 'Backend Developer' },
    { id: 'be-h5', question: 'Explain the differences between optimistic and pessimistic locking in databases.', difficulty: 'hard', category: 'Backend Developer' },
    { id: 'be-h6', question: 'How would you design an API gateway for a microservices architecture?', difficulty: 'hard', category: 'Backend Developer' },
    { id: 'be-h7', question: 'What strategies would you use to ensure zero-downtime deployments?', difficulty: 'hard', category: 'Backend Developer' },
    { id: 'be-h8', question: 'Explain the event sourcing pattern and when you would use it.', difficulty: 'hard', category: 'Backend Developer' },
  ],

  'Java Developer': [
    // ── Easy ──
    { id: 'ja-e1', question: 'What are the main features of Java as a programming language?', difficulty: 'easy', category: 'Java Developer' },
    { id: 'ja-e2', question: 'Explain the difference between JDK, JRE, and JVM.', difficulty: 'easy', category: 'Java Developer' },
    { id: 'ja-e3', question: 'What is the difference between == and .equals() in Java?', difficulty: 'easy', category: 'Java Developer' },
    { id: 'ja-e4', question: 'What are access modifiers in Java? List and explain each one.', difficulty: 'easy', category: 'Java Developer' },
    { id: 'ja-e5', question: 'Explain the concept of Object-Oriented Programming and its four pillars.', difficulty: 'easy', category: 'Java Developer' },
    { id: 'ja-e6', question: 'What is the difference between an abstract class and an interface in Java?', difficulty: 'easy', category: 'Java Developer' },
    { id: 'ja-e7', question: 'What is exception handling in Java? Explain try-catch-finally.', difficulty: 'easy', category: 'Java Developer' },
    { id: 'ja-e8', question: 'What is the purpose of the final keyword in Java?', difficulty: 'easy', category: 'Java Developer' },

    // ── Medium ──
    { id: 'ja-m1', question: 'Explain the Java Collections framework. What are the differences between List, Set, and Map?', difficulty: 'medium', category: 'Java Developer' },
    { id: 'ja-m2', question: 'What is Spring Boot and how does it simplify Java application development?', difficulty: 'medium', category: 'Java Developer' },
    { id: 'ja-m3', question: 'Explain how dependency injection works in Spring Framework.', difficulty: 'medium', category: 'Java Developer' },
    { id: 'ja-m4', question: 'What are Java Streams and how do they differ from traditional loops?', difficulty: 'medium', category: 'Java Developer' },
    { id: 'ja-m5', question: 'Explain the differences between HashMap, TreeMap, and LinkedHashMap.', difficulty: 'medium', category: 'Java Developer' },
    { id: 'ja-m6', question: 'What is multithreading in Java? Explain Thread vs Runnable.', difficulty: 'medium', category: 'Java Developer' },
    { id: 'ja-m7', question: 'What are annotations in Java and how are they used in Spring?', difficulty: 'medium', category: 'Java Developer' },
    { id: 'ja-m8', question: 'Explain the concept of JPA and Hibernate. How do they relate to each other?', difficulty: 'medium', category: 'Java Developer' },

    // ── Hard ──
    { id: 'ja-h1', question: 'Explain the Java Memory Model and how garbage collection works internally.', difficulty: 'hard', category: 'Java Developer' },
    { id: 'ja-h2', question: 'What is the difference between CompletableFuture and traditional Future in Java?', difficulty: 'hard', category: 'Java Developer' },
    { id: 'ja-h3', question: 'How would you optimize a Spring Boot application for high throughput?', difficulty: 'hard', category: 'Java Developer' },
    { id: 'ja-h4', question: 'Explain the internals of ConcurrentHashMap and why it is thread-safe.', difficulty: 'hard', category: 'Java Developer' },
    { id: 'ja-h5', question: 'What are the different GC algorithms in Java and when would you choose each?', difficulty: 'hard', category: 'Java Developer' },
    { id: 'ja-h6', question: 'Explain class loading in Java. What are the different class loaders?', difficulty: 'hard', category: 'Java Developer' },
    { id: 'ja-h7', question: 'How does Spring Security handle authentication and authorization internally?', difficulty: 'hard', category: 'Java Developer' },
    { id: 'ja-h8', question: 'What is reactive programming in Java? Explain Project Reactor and WebFlux.', difficulty: 'hard', category: 'Java Developer' },
  ],

  '.NET Developer': [
    // ── Easy ──
    { id: 'dn-e1', question: 'What is the .NET framework and how does it differ from .NET Core?', difficulty: 'easy', category: '.NET Developer' },
    { id: 'dn-e2', question: 'Explain the difference between value types and reference types in C#.', difficulty: 'easy', category: '.NET Developer' },
    { id: 'dn-e3', question: 'What is the purpose of the using statement in C#?', difficulty: 'easy', category: '.NET Developer' },
    { id: 'dn-e4', question: 'What are properties in C# and how do they differ from fields?', difficulty: 'easy', category: '.NET Developer' },
    { id: 'dn-e5', question: 'Explain what LINQ is and give an example of a simple query.', difficulty: 'easy', category: '.NET Developer' },
    { id: 'dn-e6', question: 'What is NuGet and how is it used in .NET projects?', difficulty: 'easy', category: '.NET Developer' },
    { id: 'dn-e7', question: 'What is the difference between String and StringBuilder in C#?', difficulty: 'easy', category: '.NET Developer' },
    { id: 'dn-e8', question: 'Explain what an ASP.NET Controller is and its purpose.', difficulty: 'easy', category: '.NET Developer' },

    // ── Medium ──
    { id: 'dn-m1', question: 'Explain the ASP.NET Core middleware pipeline. How does request processing work?', difficulty: 'medium', category: '.NET Developer' },
    { id: 'dn-m2', question: 'What is Entity Framework Core and how does it implement the ORM pattern?', difficulty: 'medium', category: '.NET Developer' },
    { id: 'dn-m3', question: 'Explain async/await in C# and how it improves application performance.', difficulty: 'medium', category: '.NET Developer' },
    { id: 'dn-m4', question: 'What is dependency injection in ASP.NET Core? Explain the three service lifetimes.', difficulty: 'medium', category: '.NET Developer' },
    { id: 'dn-m5', question: 'How does JWT authentication work in ASP.NET Core?', difficulty: 'medium', category: '.NET Developer' },
    { id: 'dn-m6', question: 'What are delegates and events in C#? How are they used?', difficulty: 'medium', category: '.NET Developer' },
    { id: 'dn-m7', question: 'Explain the difference between IEnumerable and IQueryable in Entity Framework.', difficulty: 'medium', category: '.NET Developer' },
    { id: 'dn-m8', question: 'What is the Options pattern in ASP.NET Core for configuration management?', difficulty: 'medium', category: '.NET Developer' },

    // ── Hard ──
    { id: 'dn-h1', question: 'How does the .NET garbage collector work? Explain generations and LOH.', difficulty: 'hard', category: '.NET Developer' },
    { id: 'dn-h2', question: 'Explain the difference between Task.Run, Task.Factory.StartNew, and async/await patterns.', difficulty: 'hard', category: '.NET Developer' },
    { id: 'dn-h3', question: 'How would you implement CQRS pattern in an ASP.NET Core application?', difficulty: 'hard', category: '.NET Developer' },
    { id: 'dn-h4', question: 'What is Span<T> and Memory<T> in .NET? How do they improve performance?', difficulty: 'hard', category: '.NET Developer' },
    { id: 'dn-h5', question: 'Explain how to implement a custom middleware and custom authentication handler in ASP.NET Core.', difficulty: 'hard', category: '.NET Developer' },
    { id: 'dn-h6', question: 'What are source generators in C# and how can they be used to improve performance?', difficulty: 'hard', category: '.NET Developer' },
    { id: 'dn-h7', question: 'How would you handle distributed caching with Redis in ASP.NET Core?', difficulty: 'hard', category: '.NET Developer' },
    { id: 'dn-h8', question: 'Explain the Channel<T> and pipeline patterns for high-performance data processing in .NET.', difficulty: 'hard', category: '.NET Developer' },
  ],

  'Full Stack Developer': [
    // ── Easy ──
    { id: 'fs-e1', question: 'What is the difference between frontend and backend development?', difficulty: 'easy', category: 'Full Stack Developer' },
    { id: 'fs-e2', question: 'Explain what a Single Page Application (SPA) is and name a framework that supports it.', difficulty: 'easy', category: 'Full Stack Developer' },
    { id: 'fs-e3', question: 'What is the DOM and how does React interact with it?', difficulty: 'easy', category: 'Full Stack Developer' },
    { id: 'fs-e4', question: 'What is the purpose of package managers like npm or yarn?', difficulty: 'easy', category: 'Full Stack Developer' },
    { id: 'fs-e5', question: 'Explain what responsive design is and how CSS frameworks help achieve it.', difficulty: 'easy', category: 'Full Stack Developer' },
    { id: 'fs-e6', question: 'What is version control and why is Git important for developers?', difficulty: 'easy', category: 'Full Stack Developer' },
    { id: 'fs-e7', question: 'What is CORS and why is it important in web development?', difficulty: 'easy', category: 'Full Stack Developer' },
    { id: 'fs-e8', question: 'Explain the client-server architecture in web applications.', difficulty: 'easy', category: 'Full Stack Developer' },

    // ── Medium ──
    { id: 'fs-m1', question: 'How does state management work in React? Compare useState, useReducer, and Context API.', difficulty: 'medium', category: 'Full Stack Developer' },
    { id: 'fs-m2', question: 'Explain how you would implement authentication across a full stack application using JWT.', difficulty: 'medium', category: 'Full Stack Developer' },
    { id: 'fs-m3', question: 'What is server-side rendering vs client-side rendering? When would you use each?', difficulty: 'medium', category: 'Full Stack Developer' },
    { id: 'fs-m4', question: 'How would you structure a REST API to be consumed by a React frontend?', difficulty: 'medium', category: 'Full Stack Developer' },
    { id: 'fs-m5', question: 'Explain the concept of WebSockets. How do they differ from HTTP requests?', difficulty: 'medium', category: 'Full Stack Developer' },
    { id: 'fs-m6', question: 'What is Docker and how does containerization help full stack development?', difficulty: 'medium', category: 'Full Stack Developer' },
    { id: 'fs-m7', question: 'How would you handle file uploads from a React frontend to a backend API?', difficulty: 'medium', category: 'Full Stack Developer' },
    { id: 'fs-m8', question: 'Explain the differences between REST and GraphQL. When would you choose each?', difficulty: 'medium', category: 'Full Stack Developer' },

    // ── Hard ──
    { id: 'fs-h1', question: 'How would you design a real-time collaborative editing system like Google Docs?', difficulty: 'hard', category: 'Full Stack Developer' },
    { id: 'fs-h2', question: 'Explain how you would implement CI/CD for a full stack application deployed on cloud.', difficulty: 'hard', category: 'Full Stack Developer' },
    { id: 'fs-h3', question: 'How would you optimize the performance of a React app that renders thousands of items?', difficulty: 'hard', category: 'Full Stack Developer' },
    { id: 'fs-h4', question: 'Design a scalable URL shortener. Explain both frontend and backend components.', difficulty: 'hard', category: 'Full Stack Developer' },
    { id: 'fs-h5', question: 'How would you implement OAuth 2.0 with social login across a full stack application?', difficulty: 'hard', category: 'Full Stack Developer' },
    { id: 'fs-h6', question: 'Explain micro-frontend architecture. When and why would you use it?', difficulty: 'hard', category: 'Full Stack Developer' },
    { id: 'fs-h7', question: 'How would you handle database migrations in a production full stack application?', difficulty: 'hard', category: 'Full Stack Developer' },
    { id: 'fs-h8', question: 'Design an end-to-end monitoring and logging strategy for a full stack application.', difficulty: 'hard', category: 'Full Stack Developer' },
  ],
};

/**
 * Returns a random set of questions for the given role.
 * Picks a mix of easy, medium, and hard questions.
 */
export function getRandomQuestions(role, count = 5) {
  const pool = questionBank[role];
  if (!pool || pool.length === 0) return [];

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Returns all available role names.
 */
export function getAvailableRoles() {
  return Object.keys(questionBank);
}

/**
 * Returns questions filtered by difficulty for a role.
 */
export function getQuestionsByDifficulty(role, difficulty) {
  const pool = questionBank[role];
  if (!pool) return [];
  return pool.filter((q) => q.difficulty === difficulty);
}

export default questionBank;
