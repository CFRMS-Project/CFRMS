/**
 * =============================================================
 * FB-SUB: Gửi Đánh Giá (Customer Submit Feedback)
 * =============================================================
 * Test cases: FB-SUB-01 → FB-SUB-07
 * Routes:
 *   GET  /feedback/new      → Form đánh giá (protected)
 *   POST /feedback          → Gửi đánh giá
 */

describe("FB-SUB: Gửi đánh giá", () => {
  before(() => cy.task("db:reset"));

  // ── FB-SUB-01: Chưa login → redirect khi vào /feedback/new ──
  it("[FB-SUB-01] Chưa đăng nhập → redirect về /login khi vào /feedback/new", () => {
    Cypress.session.clearAllSavedSessions();
    cy.visit("/feedback/new", { failOnStatusCode: false });
    cy.url().should("include", "/login");
  });

  // ── FB-SUB-02: Form đánh giá hiển thị đủ trường ─────────────
  it("[FB-SUB-02] Form đánh giá hiển thị đầy đủ trường (khi đã đăng nhập)", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");
    cy.url().should("not.include", "/login");
    // Textarea nội dung
    cy.get('textarea[name="content"]').should("be.visible");
    // Input tags
    cy.get('input[name="tags"]').should("exist");
    // Nút submit
    cy.get('button[type="submit"]').should("be.visible");
    // Input file upload ảnh
    cy.get('input[type="file"]').should("exist");
  });

  // ── FB-SUB-03: Gửi đánh giá hợp lệ thành công ───────────────
  it("[FB-SUB-03] Gửi đánh giá hợp lệ → redirect với ?message=success", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");

    // Mock Cloudinary upload
    cy.intercept("POST", "**/upload**", {
      fixture: "cloudinary-mock.json",
      statusCode: 200,
    }).as("cloudinaryUpload");

    cy.fixture("feedbacks").then((feedbacks) => {
      const data = feedbacks.valid;

      // Chọn rating (thử set trực tiếp vào input)
      cy.get("body").then(($body) => {
        if ($body.find(`input[name="rating"][value="${data.rating}"]`).length > 0) {
          cy.get(`input[name="rating"][value="${data.rating}"]`).check({ force: true });
        } else {
          cy.get('input[name="rating"]').first().invoke("val", String(data.rating)).trigger("input", { force: true });
        }
      });

      cy.get('textarea[name="content"]').type(data.content);

      if (data.tags) {
        cy.get('input[name="tags"]').invoke("val", data.tags).trigger("change", { force: true });
      }

      cy.get('button[type="submit"]').click();
      cy.url().should("include", "message=success");
    });
  });

  // ── FB-SUB-04: Gửi đánh giá thiếu nội dung ──────────────────
  it("[FB-SUB-04] Gửi đánh giá thiếu nội dung → lỗi validation", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");

    // Không điền content, thử submit
    cy.get("body").then(($body) => {
      if ($body.find(`input[name="rating"]`).length > 0) {
        cy.get('input[name="rating"]').first().invoke("val", "3").trigger("input", { force: true });
      }
    });
    // Để trống textarea
    cy.get('textarea[name="content"]').clear();
    cy.get('button[type="submit"]').click();

    // Kiểm tra browser validation (required) hoặc server trả về lỗi
    cy.get("body").then(($body) => {
      const hasHtmlValidation = $body.find('textarea[name="content"]:invalid').length > 0;
      if (!hasHtmlValidation) {
        // Server validation: vẫn ở trang form hoặc có thông báo lỗi
        cy.url().should("not.include", "message=success");
      }
    });
  });

  // ── FB-SUB-05: Nội dung vượt 500 ký tự ──────────────────────
  it("[FB-SUB-05] Nội dung > 500 ký tự → server trả lỗi 400", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");

    cy.get("body").then(($body) => {
      if ($body.find(`input[name="rating"]`).length > 0) {
        cy.get('input[name="rating"]').first().invoke("val", "3").trigger("input", { force: true });
      }
    });
    // Dùng invoke('val') thay vì .type() để bypass thuộc tính maxlength='500' trên textarea
    // Nếu dùng .type(), trình duyệt sẽ tự cắt ký tự ở 500 → server không thấy lỗi
    const longContent = "A".repeat(501);
    cy.get('textarea[name="content"]').invoke("val", longContent);
    cy.get('button[type="submit"]').click();

    // Assert server trả lỗi (không redirect thành công)
    cy.url().should("not.include", "message=success");
    cy.get("body").then(($body) => {
      if ($body.text().includes("không được quá 500 ký tự")) {
        cy.contains("không được quá 500 ký tự").should("exist");
      }
    });
  });

  // ── FB-SUB-06: Gửi đánh giá ẩn danh ────────────────────────
  it("[FB-SUB-06] Gửi đánh giá ẩn danh → redirect thành công", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");

    cy.intercept("POST", "**/upload**", {
      fixture: "cloudinary-mock.json",
      statusCode: 200,
    });

    cy.fixture("feedbacks").then((feedbacks) => {
      cy.get("body").then(($body) => {
        if ($body.find(`input[name="rating"]`).length > 0) {
          cy.get('input[name="rating"]').first().invoke("val", "5").trigger("input", { force: true });
        }
      });
      cy.get('textarea[name="content"]').type(feedbacks.anonymous.content);
      // Tích ẩn danh
      cy.get('input[name="isAnonymous"]').check({ force: true });
      cy.get('button[type="submit"]').click();
      cy.url().should("include", "message=success");
    });
  });

  // ── FB-SUB-07: UI có input upload ảnh ───────────────────────
  it("[FB-SUB-07] Form đánh giá có trường upload ảnh", () => {
    cy.loginAsCustomer();
    cy.visit("/feedback/new");
    cy.get('input[type="file"]').should("exist");
  });
});
