/**
 * =============================================================
 * AUTH-ADM: Admin Login & Access Control
 * =============================================================
 * Test cases: AUTH-ADM-01 → AUTH-ADM-05
 * Routes:  GET /admin/login, POST /admin/login, GET /admin/dashboard
 */

describe("AUTH-ADM: Admin Login & Access Control", () => {
  before(() => cy.task("db:reset"));
  beforeEach(() => Cypress.session.clearAllSavedSessions());

  // ── AUTH-ADM-01: Hiển thị trang admin login ─────────────────
  it("[AUTH-ADM-01] Hiển thị form đăng nhập admin", () => {
    cy.visit("/admin/login");
    cy.get('input[name="username"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
    cy.get('button[type="submit"]').should("be.visible");
  });

  // ── AUTH-ADM-02: Admin đăng nhập thành công ─────────────────
  it("[AUTH-ADM-02] Admin đăng nhập thành công → redirect /admin/dashboard", () => {
    cy.fixture("users").then((users) => {
      cy.visit("/admin/login");
      cy.get('input[name="username"]').type(users.admin.username);
      cy.get('input[name="password"]').type(users.admin.password);
      cy.get('button[type="submit"]').click();
      cy.url().should("include", "/admin/dashboard");
    });
  });

  // ── AUTH-ADM-03: Tài khoản customer không được vào admin ────
  it("[AUTH-ADM-03] Tài khoản customer bị từ chối vào admin", () => {
    cy.fixture("users").then((users) => {
      cy.visit("/admin/login");
      cy.get('input[name="username"]').type(users.customer.username);
      cy.get('input[name="password"]').type(users.customer.password);
      cy.get('button[type="submit"]').click();
      // Vẫn ở trang admin login
      cy.url().should("include", "/admin/login");
      cy.contains("Bạn không có quyền truy cập trang quản trị!").should("be.visible");
    });
  });

  // ── AUTH-ADM-04: Mật khẩu admin sai ────────────────────────
  it("[AUTH-ADM-04] Mật khẩu admin sai → hiển thị lỗi", () => {
    cy.fixture("users").then((users) => {
      cy.visit("/admin/login");
      cy.get('input[name="username"]').type(users.admin.username);
      cy.get('input[name="password"]').type("wrong_password");
      cy.get('button[type="submit"]').click();
      cy.url().should("include", "/admin/login");
      cy.contains("Mật khẩu không chính xác!").should("be.visible");
    });
  });

  // ── AUTH-ADM-05: Truy cập dashboard chưa login → redirect ───
  it("[AUTH-ADM-05] Truy cập /admin/dashboard chưa login → redirect về login", () => {
    cy.visit("/admin/dashboard", { failOnStatusCode: false });
    // Server redirect về /login hoặc /admin/login
    cy.url().should("match", /\/(admin\/login|login)/);
  });
});
