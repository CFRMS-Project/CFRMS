/**
 * =============================================================
 * FB-EDIT: Sửa Đánh Giá (Customer Edit Feedback)
 * =============================================================
 * Test cases: FB-EDIT-01 → FB-EDIT-04
 * Routes:
 *   GET  /feedback/:id/edit         → Form sửa (protected)
 *   POST /feedback/:id/update       → Gửi cập nhật
 */

describe("FB-EDIT: Sửa đánh giá", () => {
  before(() => cy.task("db:reset"));

  // ── FB-EDIT-01: Chủ sở hữu mở form sửa ─────────────────────
  it("[FB-EDIT-01] Chủ sở hữu mở được form sửa đánh giá của mình", () => {
    cy.loginAsCustomer();
    cy.fixture("seed-data").then((seedData) => {
      // fb2 = PENDING của customer01
      const id = seedData.feedbacks.pendingId;
      cy.visit(`/feedback/${id}/edit`);
      cy.url().should("not.include", "/login");
      // Form hiển thị với dữ liệu cũ được prefill
      cy.get('textarea[name="content"]').should("have.value", "Đang chờ duyệt, sản phẩm ổn.");
    });
  });

  // ── FB-EDIT-02: User khác không sửa được ────────────────────
  it("[FB-EDIT-02] User khác không thể mở form sửa đánh giá của customer01", () => {
    // Đăng nhập với customer02
    cy.session(
      "customer02-session",
      () => {
        cy.fixture("users").then((users) => {
          cy.visit("/login");
          cy.get('input[name="username"]').type(users.customer2.username);
          cy.get('input[name="password"]').type(users.customer2.password);
          cy.get('button[type="submit"]').click();
          cy.url().should("include", "/customer/home");
        });
      }
    );
    cy.fixture("seed-data").then((seedData) => {
      const id = seedData.feedbacks.pendingId; // feedback của customer01
      cy.request({
        url: `/feedback/${id}/edit`,
        failOnStatusCode: false,
      }).then((response) => {
        // Phải trả về 403 hoặc 404 (không tìm thấy vì userId không khớp)
        expect(response.status).to.be.oneOf([403, 404]);
      });
    });
  });

  // ── FB-EDIT-03: Sửa đánh giá thành công ─────────────────────
  it("[FB-EDIT-03] Sửa đánh giá thành công → redirect ?message=update_success", () => {
    cy.loginAsCustomer();

    cy.intercept("POST", "**/upload**", {
      fixture: "cloudinary-mock.json",
      statusCode: 200,
    });

    cy.fixture("seed-data").then((seedData) => {
      cy.fixture("feedbacks").then((feedbacks) => {
        const id = seedData.feedbacks.pendingId;
        cy.visit(`/feedback/${id}/edit`);

        // Thay đổi nội dung và rating
        cy.get('textarea[name="content"]').clear().type(feedbacks.updated.content);
        cy.get("body").then(($body) => {
          if ($body.find(`input[name="rating"][value="3"]`).length > 0) {
            cy.get('input[name="rating"][value="3"]').check({ force: true });
          } else {
            cy.get('input[name="rating"]').first().invoke("val", "3").trigger("input", { force: true });
          }
        });

        cy.get('button[type="submit"]').click();
        cy.url().should("include", "message=update_success");
      });
    });
  });

  // ── FB-EDIT-04: Sửa với nội dung rỗng → lỗi ────────────────
  it("[FB-EDIT-04] Sửa đánh giá với nội dung rỗng → lỗi validation", () => {
    cy.loginAsCustomer();
    cy.fixture("seed-data").then((seedData) => {
      const id = seedData.feedbacks.pendingId;
      cy.visit(`/feedback/${id}/edit`);

      cy.get('textarea[name="content"]').clear();
      cy.get('button[type="submit"]').click();

      // Không được redirect thành công
      cy.url().should("not.include", "message=update_success");
    });
  });
});
