entity test_tool_reporting is
end entity;
architecture arch of test_tool_reporting is
begin
  `if UNDEFINED < "5" then
    `error "yoyoyo"
  `end if
end architecture;