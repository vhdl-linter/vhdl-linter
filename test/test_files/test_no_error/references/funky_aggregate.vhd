entity funky_aggregate is
end entity;
architecture arch of funky_aggregate is
  signal foo : work.record_alias.rec;   -- vhdl-linter-disable-line unused
begin
-- vhdl-linter-disable-next-line not-declared
  foo <= (elem => 5);                   -- TODO: elaborate choices of aggregates for records from not used packages to not throw an error.
end architecture;
