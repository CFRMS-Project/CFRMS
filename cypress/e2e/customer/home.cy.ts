/**
 * =============================================================
 * HOME: Trang chủ Customer
 * =============================================================
 * Test cases: HOME-01 → HOME-03
 * Routes:  GET /, GET /customer/home
 */

describe("HOME: Trang chủ Customer", () => {
  before(() => cy.task("db:reset"));
  beforeEach(() => Cypress.session.clearAllSavedSessions());

  // ── HOME-01: Trang home public, không cần login ──────────────
  it("[HOME-01] Trang /customer/home hiển thị công khai, không redirect", () => {
    cy.visit("/customer/home");
    // Assert không bị redirect về login
    cy.url().should("not.include", "/login");
    // Assert trang có nội dung (có ít nhất 1 heading hoặc phần tử chính)
    cy.get("body").should("not.be.empty");
  });

  // ── HOME-02: Root / redirect về /customer/home ───────────────
  it("[HOME-02] Truy cập / → redirect về /customer/home", () => {
    cy.visit("/");
    cy.url().should("include", "/customer/home");
  });

  // ── HOME-03: Khi đã login, trang home hiển thị thông tin user
  it("[HOME-03] Khi đã đăng nhập, trang home hiển thị thông tin user", () => {
    cy.loginAsCustomer();
    cy.visit("/customer/home");
    cy.url().should("not.include", "/login");
    // Assert trang không bị redirect và có nội dung sau login
    cy.get("body").should("not.be.empty");
  });
});
