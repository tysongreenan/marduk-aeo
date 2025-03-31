from setuptools import setup, find_packages

setup(
    name="marduk-aeo",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi",
        "uvicorn",
        "gunicorn",
        "python-dotenv",
        "httpx",
        "aiohttp",
        "redis",
        "supabase",
        "apscheduler",
        "pydantic",
        "python-jose",
        "python-multipart",
        "rich",
        "psycopg2-binary",
        "celery",
        "flower",
        "sendgrid"
    ],
) 