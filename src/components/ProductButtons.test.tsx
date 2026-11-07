import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { ProductButtons } from "./ProductButtons";

afterEach(cleanup);
describe("product destinations", () => {
  it.each([
    ["Knaakie", "/knaakie"],
    ["Vakansie", "/signup"],
    ["Knaakie", "/trip/example/samen?section=expenses"],
    ["Vakansie", "/trip/example"],
  ])("opens %s at %s", (name, destination) => {
    render(<MemoryRouter><Routes>
      <Route path="/" element={<ProductButtons knaakieTo={name === "Knaakie" ? destination : "/knaakie"} vakansieTo={name === "Vakansie" ? destination : "/signup"} />} />
      <Route path={destination.split("?")[0]} element={<p>Bestemming geopend</p>} />
    </Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole("link", { name: new RegExp(name) }));
    expect(screen.getByText("Bestemming geopend")).toBeInTheDocument();
  });
});