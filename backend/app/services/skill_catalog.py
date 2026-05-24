import re

from backend.app.services.normalization import normalize_key, normalize_text


CATEGORY_SKILLS: dict[str, tuple[str, ...]] = {
    "Software Engineering": (
        ".Net",
        "C#",
        "Java",
        "JPA/Hibernate",
        "Mockito",
        "OOD",
        "Spring Framework",
        "Spring Security",
        "UML",
        "Mainframe Dev",
        "Microservices",
        "Full Stack Web Development - Java",
    ),
    "AI/ML": (
        "Spec Driven Development (SDD)",
        "Prompt Engineering Framework",
        "RAG",
        "LLM Models",
        "LangChain, Spring AI, LangChain4j, Semantic Kernel",
        "SonarSource",
        "Validation/Guardrails - Pydantic",
        "LangGraph/Workflow Framework",
        "Retrieval Layer - ChromaDB/Any Vector DB",
        "AI Governance",
        "Automation",
    ),
    "Business Management": (
        "Business Analysis",
        "Change Management",
        "Financial Industry Awareness",
        "Governance",
        "Leadership Coaching & Change",
        "MS Dynamics",
        "Product Management",
        "Professional Skills",
        "Risk Management",
        "Stakeholder Engagement",
    ),
    "Cloud": (
        "Cloud Computing",
        "Cloud Migration",
        "GCP/AWS/Microsoft Azure",
        "VMWare",
        "Cloud Modernisation",
    ),
    "IT Operations": (
        "OS Admin",
        "Unix",
        "Linux",
        "ITIL",
    ),
    "DevOps": (
        "CI/CD",
        "Jenkins",
        "Docker/Kubernetes",
        "Git/Github/Gitlab",
        "SonarSource",
        "Gradle",
        "Linux",
        "Power Automate",
        "Terraform",
    ),
    "Project Management": (
        "Agile Scrum",
        "Confluence",
        "Jira",
        "Release Management",
        "Scrum Master",
    ),
    "Data Analytics/Engineering": (
        "Python",
        "Data Visualization With Tableau",
        "Data Visualization With Power BI",
        "Databricks",
        "Hadoop Environment (HDFS, Hive, MapReduce)",
        "Apache Spark, PySpark",
        "Kafka",
        "Data Analytics",
        "Data Engineering",
        "Data Science",
    ),
    "Database Management": (
        "SQL",
        "PL-SQL",
        "MongoDB",
        "JSON",
    ),
    "Web Application": (
        "Angular",
        "Bootstrap",
        "HTML/CSS",
        "JQuery",
        "Next.js",
        "PowerApps",
        "React",
        "ReactJS",
        "REST API",
    ),
    "Testing": (
        "API Testing",
        "Appium/Mobile Testing",
        "Database/JDBC Testing",
        "Playwright",
        "Postman",
        "Selenium/Cucumber",
        "Specflow",
        "TDD/JMeter",
        "TestNG",
        "Cybersecurity",
    ),
    "Other Programming Languages": (
        "C/C++",
        "COBOL",
        "Javascript",
        "NodeJS",
        "Ruby on Rails",
        "Scala",
        "Typescript",
    ),
    "Soft Skills": (
        "Communication",
        "Interpersonal Skills",
        "Problem Solving",
        "Strategic Thinking",
        "Time Management",
        "Consultancy",
    ),
}

CATEGORY_ORDER = tuple(CATEGORY_SKILLS.keys()) + ("Additional Skills",)


def _catalog_key(value: str) -> str:
    key = normalize_key(value)
    key = re.sub(r"[^a-z0-9#]+", "_", key)
    while "__" in key:
        key = key.replace("__", "_")
    return key.strip("_")


SKILL_LOOKUP: dict[str, tuple[str, str]] = {}
for category, skills in CATEGORY_SKILLS.items():
    for skill in skills:
        SKILL_LOOKUP.setdefault(_catalog_key(skill), (skill, category))

SKILL_ALIASES = {
    "net": ".Net",
    "jpa_hibernate": "JPA/Hibernate",
    "spec_driven_development_sdd": "Spec Driven Development (SDD)",
    "spec_driven_development_s_dd": "Spec Driven Development (SDD)",
    "validation_guardrails_pydantic": "Validation/Guardrails - Pydantic",
    "langgraph_workflow_framework": "LangGraph/Workflow Framework",
    "retrieval_layer_chromadb_any_vector_db": "Retrieval Layer - ChromaDB/Any Vector DB",
    "docker_kubernetes": "Docker/Kubernetes",
    "data_visualization_with_power_bi": "Data Visualization With Power BI",
    "hadoop_environment_hdfs_hive_mapreduce": "Hadoop Environment (HDFS, Hive, MapReduce)",
    "apache_spark_pyspark": "Apache Spark, PySpark",
    "database_jdbc_testing": "Database/JDBC Testing",
    "selenium_cucumber": "Selenium/Cucumber",
    "tdd_jmeter": "TDD/JMeter",
    "testnj": "TestNG",
    "javascript": "Javascript",
}

for alias, skill in SKILL_ALIASES.items():
    for category, skills in CATEGORY_SKILLS.items():
        if skill in skills:
            SKILL_LOOKUP[alias] = (skill, category)
            break

SKILL_LOOKUP["sonarsource2"] = ("SonarSource", "DevOps")
SKILL_LOOKUP["linux2"] = ("Linux", "DevOps")

ACRONYMS = {
    "ai",
    "api",
    "aws",
    "ci",
    "cobol",
    "css",
    "db",
    "gcp",
    "hdfs",
    "html",
    "itil",
    "jdbc",
    "json",
    "llm",
    "ms",
    "ood",
    "pl",
    "rag",
    "rest",
    "sdd",
    "sql",
    "tdd",
    "uml",
}

SPECIAL_WORDS = {
    "ci-cd": "CI/CD",
    "github": "Github",
    "gitlab": "Gitlab",
    "jquery": "JQuery",
    "mapreduce": "MapReduce",
    "mongodb": "MongoDB",
    "next.js": "Next.js",
    "nodejs": "NodeJS",
    "powerapps": "PowerApps",
    "pyspark": "PySpark",
    "pl-sql": "PL-SQL",
    "reactjs": "ReactJS",
    "typescript": "Typescript",
    "vmware": "VMWare",
}


def display_case_skill(value: object) -> str:
    text = normalize_text(value).replace("_", " ")
    if not text:
        return ""
    tokens = []
    for raw_word in text.split():
        word = raw_word.strip()
        if not word:
            continue
        lower = word.lower()
        if lower in SPECIAL_WORDS:
            tokens.append(SPECIAL_WORDS[lower])
        elif lower in ACRONYMS:
            tokens.append(lower.upper())
        elif "/" in word:
            tokens.append("/".join(display_case_skill(part) for part in word.split("/")))
        elif "-" in word and lower not in {"pl-sql", "ci-cd"}:
            tokens.append("-".join(display_case_skill(part) for part in word.split("-")))
        else:
            tokens.append(lower[:1].upper() + lower[1:])
    return " ".join(tokens)


def canonical_skill(value: object, fallback_category: str = "Additional Skills") -> tuple[str, str]:
    text = normalize_text(value)
    if not text:
        return "", fallback_category
    match = SKILL_LOOKUP.get(_catalog_key(text))
    if match:
        return match
    return display_case_skill(text), fallback_category


def catalog_skill(value: object) -> tuple[str, str] | None:
    text = normalize_text(value)
    if not text:
        return None
    return SKILL_LOOKUP.get(_catalog_key(text))


def skill_catalog_groups() -> list[dict[str, object]]:
    return [{"category": category, "skills": list(skills)} for category, skills in CATEGORY_SKILLS.items()]


def normalize_existing_skill_records(session: object) -> int:
    from backend.app import models

    changed = 0
    for skill in session.query(models.Skill).all():
        key = _catalog_key(skill.skill_name)
        if "appetite" in key and "client" in key:
            session.delete(skill)
            changed += 1
            continue
        skill_name, skill_category = canonical_skill(skill.skill_name, skill.skill_category or "Additional Skills")
        if skill.skill_name != skill_name or skill.skill_category != skill_category:
            skill.skill_name = skill_name
            skill.skill_category = skill_category
            changed += 1
    for trainer in session.query(models.Trainer).all():
        seen: dict[str, int] = {}
        for skill in sorted(trainer.skills, key=lambda item: item.id or 0):
            seen[skill.skill_name] = seen.get(skill.skill_name, 0) + 1
            if skill.skill_name in {"SonarSource", "Linux"} and seen[skill.skill_name] > 1:
                if skill.skill_category != "DevOps":
                    skill.skill_category = "DevOps"
                    changed += 1
    if changed:
        session.commit()
    return changed
