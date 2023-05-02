entity test_regression is
end entity;
architecture arch of test_regression is
begin
  `if DEVICE = "Arria10" then
    `error "Device Arria"
  `else
    `error "Device Other"
  `end if
end architecture;