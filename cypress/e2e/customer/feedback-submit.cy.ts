/**
 * =============================================================
 * FB-SUB: Gui danh gia
 * =============================================================
 * Test cases: FB-SUB-01 -> FB-SUB-07
 * Routes:
 *   GET  /feedback/new -> Form danh gia (protected)
 *   POST /feedback    -> Gui danh gia
 */

const setRating = (rating: number) => {
  cy.get('input[name="rating"]')
    .first()
    .invoke("val", String(rating))
    .trigger("input", { force: true });
};

describe("FB-SUB: Gui danh gia", () => {
  before(() => cy.task("db:reset"));

  it("[FB-SUB-01] Chua dang nhap -> redirect ve /login khi vao /feedback/new", () => {
    Cypress.session.clearAllSavedSessions();
    cy.visit("/feedback/new", { failOnStatusCode: false });
    cy.url().should("include", "/login");
  });

  it("[FB-SUB-02] Form danh gia hien thi day du truong va rule validation", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");

    cy.url().should("not.include", "/login");
    cy.get('textarea[name="content"]')
      .should("be.visible")
      .and("have.attr", "required");
    cy.get('textarea[name="content"]')
      .should("have.attr", "maxlength", "500");
    cy.get('input[name="tags"]').should("exist");
    cy.get('button[type="submit"]').should("be.visible");
    cy.get('input[type="file"]').should("exist");
  });

  it("[FB-SUB-03] Gui danh gia hop le -> redirect voi ?message=success", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");

    cy.fixture("feedbacks").then((feedbacks) => {
      const data = feedbacks.valid;

      setRating(data.rating);
      cy.get('textarea[name="content"]').clear().type(data.content);

      if (data.tags) {
        cy.get('input[name="tags"]')
          .invoke("val", data.tags)
          .trigger("change", { force: true });
      }

      cy.get('button[type="submit"]').click();
      cy.url().should("include", "message=success");
    });
  });

  it("[FB-SUB-04] Gui danh gia thieu noi dung -> form bi chan submit", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");

    setRating(3);
    cy.get('textarea[name="content"]').as("contentInput").clear();
    cy.get('button[type="submit"]').click();

    cy.get("@contentInput").then(($textarea) => {
      const textareaElement = $textarea.get(0);
      expect(textareaElement, "content textarea").to.exist;

      const textarea = textareaElement as unknown as {
        validity: { valueMissing: boolean };
        checkValidity: () => boolean;
      };
      expect(textarea.validity.valueMissing).to.eq(true);
      expect(textarea.checkValidity()).to.eq(false);
    });
    cy.url().should("not.include", "message=success");
  });

  it("[FB-SUB-05] Noi dung > 500 ky tu -> validation chan submit", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");

    const alertStub = cy.stub().as("alert");
    cy.on("window:alert", alertStub);

    setRating(3);
    const longContent = "A".repeat(501);
    cy.get('textarea[name="content"]')
      .invoke("val", longContent)
      .trigger("input", { force: true });

    cy.get("#charCount").should("contain", "501/500");
    cy.get('button[type="submit"]').click();

    cy.get("@alert").should(
      "have.been.calledWith",
      "Nội dung đánh giá không được quá 500 ký tự."
    );
    cy.url().should("not.include", "message=success");
  });

  it("[FB-SUB-06] Gui danh gia an danh -> redirect thanh cong", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");

    cy.fixture("feedbacks").then((feedbacks) => {
      setRating(5);
      cy.get('textarea[name="content"]').clear().type(feedbacks.anonymous.content);
      cy.get('input[name="isAnonymous"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      cy.url().should("include", "message=success");
    });
  });

  it("[FB-SUB-07] Form danh gia co truong upload anh", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");
    cy.get('input[type="file"]').should("exist");
  });
});
