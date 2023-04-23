entity test_tool_unknown is
end entity;
architecture arch of test_tool_unknown is
begin
  -- This is unknown shall throw info but not kill the parser
  `UNKNOWN TOOL DIRECTIVE
end architecture;