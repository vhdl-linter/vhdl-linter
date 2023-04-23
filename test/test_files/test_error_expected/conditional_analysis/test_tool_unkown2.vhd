entity test_tool_unknown is
end entity;
architecture arch of test_tool_unknown is
begin
  `if TOOL /= "ASD" then -- This will be true
  -- This is unknown shall throw info but not kill the parser
  `UNKNOWN TOOL DIRECTIVE
  `end if
end architecture;