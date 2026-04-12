/**
 * =============================================================
 * AUTH-CUS: Customer Login / Logout
 * =============================================================
 * Test cases: AUTH-CUS-01 → AUTH-CUS-05
 * Routes:  GET /login, POST /login, GET /logout
 */

describe("AUTH-CUS: Customer Login & Logout", () => {
  before(() => cy.task("db:reset"));
  // Xóa session trước mỗi test để không bị cache
  beforeEach(() => Cypress.session.clearAllSavedSessions());

  // ── AUTH-CUS-01: Hiển thị trang login ──────────────────────
  it("[AUTH-CUS-01] Hiển thị form đăng nhập với đầy đủ trường", () => {
    cy.visit("/login");
    cy.get('input[name="username"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
    cy.get('button[type="submit"]').should("be.visible");
  });

  // ── AUTH-CUS-02: Đăng nhập thành công ──────────────────────
  it("[AUTH-CUS-02] Đăng nhập thành công → redirect /customer/home", () => {
    cy.fixture("users").then((users) => {
      cy.visit("/login");
      cy.get('input[name="username"]').type(users.customer.username);
      cy.get('input[name="password"]').type(users.customer.password);
      cy.get('button[type="submit"]').click();
      cy.url().should("include", "/customer/home");
    });
  });

  // ── AUTH-CUS-03: Username không tồn tại ─────────────────────
  it("[AUTH-CUS-03] Username không tồn tại → hiển thị lỗi", () => {
    cy.fixture("users").then((users) => {
      cy.visit("/login");
      cy.get('input[name="username"]').type(users.invalid.username);
      cy.get('input[name="password"]').type(users.invalid.password);
      cy.get('button[type="submit"]').click();
      // Vẫn ở trang login
      cy.url().should("include", "/login");
      cy.contains("Tên đăng nhập không tồn tại!").should("be.visible");
    });
  });

  // ── AUTH-CUS-04: Mật khẩu sai ───────────────────────────────
  it("[AUTH-CUS-04] Mật khẩu sai → hiển thị lỗi", () => {
    cy.fixture("users").then((users) => {
      cy.visit("/login");
      cy.get('input[name="username"]').type(users.customer.username);
      cy.get('input[name="password"]').type("wrong_password");
      cy.get('button[type="submit"]').click();
      cy.url().should("include", "/login");
      cy.contains("Mật khẩu không chính xác!").should("be.visible");
    });
  });

  // ── AUTH-CUS-05: Đăng xuất → session bị xóa ────────────────
  it("[AUTH-CUS-05] Đăng xuất → redirect /login, session bị xóa", () => {
    cy.fixture("users").then((users) => {
      // Login trước
      cy.visit("/login");
      cy.get('input[name="username"]').type(users.customer.username);
      cy.get('input[name="password"]').type(users.customer.password);
      cy.get('button[type="submit"]').click();
      cy.url().should("include", "/customer/home");

      // Logout
      cy.visit("/logout");
      cy.url().should("include", "/login");

      // Kiểm tra session đã hết: truy cập protected route bị redirect
      cy.visit("/customer/history");
      cy.url().should("include", "/login");
    });
  });
});
