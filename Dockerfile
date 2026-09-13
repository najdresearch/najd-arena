FROM python:3.13-slim
WORKDIR /workspace
COPY . /workspace
RUN pip install --no-cache-dir .
ENTRYPOINT ["najd-arena"]

