(() => {
  const params = new URLSearchParams(location.search);
  const mode = params.get("review-harness");
  const fixture = params.get("fixture");
  const fixtures = {
    lunch: {
      version: 1,
      expenses: [{ id: "fixture-lunch", name: "Lunch", amountCents: "1250", category: "Food" }],
    },
    two: {
      version: 1,
      expenses: [
        { id: "fixture-lunch", name: "Lunch", amountCents: "1250", category: "Food" },
        { id: "fixture-train", name: "Train", amountCents: "2000", category: "Travel" },
      ],
    },
    edited: {
      version: 1,
      expenses: [
        { id: "fixture-lunch", name: "Lunch", amountCents: "1250", category: "Food" },
        { id: "fixture-bill", name: "Power bill", amountCents: "4575", category: "Bills" },
      ],
    },
  };
  if (fixture && fixtures[fixture] && !sessionStorage.getItem(`expense-fixture-${fixture}`)) {
    localStorage.setItem("expense-tracker:v1", JSON.stringify(fixtures[fixture]));
    sessionStorage.setItem(`expense-fixture-${fixture}`, "true");
  }
  if (!mode) return;

  const banner = document.createElement("aside");
  banner.className = "review-harness";
  banner.setAttribute("role", "note");
  document.body.prepend(banner);
  document.body.dataset.harness = mode;

  if (mode === "allowlist") {
    banner.textContent = "Harness-forced allowlist probe — “Entertainment” is injected by the review harness and is not a shipped app option.";
    const injected = document.createElement("option");
    injected.value = "Entertainment";
    injected.textContent = "Entertainment — harness injected";
    document.querySelector("#expense-category").append(injected);
    return;
  }

  if (mode === "storage") {
    banner.textContent = "Storage recovery harness — seeds only the app’s local key in this fresh review context.";
    const simulate = document.createElement("button");
    simulate.id = "simulate-external-change";
    simulate.type = "button";
    simulate.textContent = "Simulate another-tab save";
    banner.append(simulate);

    const key = "expense-tracker:v1";
    if (!sessionStorage.getItem("expense-recovery-seeded")) {
      localStorage.setItem(
        key,
        '{"version":1,"expenses":[{"id":"a","name":"","amountCents":"12.5","category":"Snacks"}]}'
      );
      sessionStorage.setItem("expense-recovery-seeded", "true");
    }

    simulate.addEventListener("click", () => {
      const current = JSON.parse(localStorage.getItem(key));
      if (!current.expenses.some((expense) => expense.name === "Coffee")) {
        current.expenses.push({
          id: "harness-coffee",
          name: "Coffee",
          amountCents: "300",
          category: "Food",
        });
      }
      localStorage.setItem(key, JSON.stringify(current));
    });
  }
})();
