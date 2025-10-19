async function login() {
  const response = await fetch("/api/hello", {
    method: "GET",
    headers: {
      "Authorization": "Basic " + btoa("admin:password")
    }
  });
  const data = await response.text();
  alert(data);
}
login();