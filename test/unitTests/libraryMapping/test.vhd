--! @library wrong
entity test is
end entity;
architecture rtl of test is
begin
  inst_sub: entity work.sub;
end architecture;