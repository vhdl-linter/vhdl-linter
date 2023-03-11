-- vhdl-linter-disable unused
entity test_formal is
end entity;
architecture arch of test_formal is
  type CoverageIDType is record
    ID : integer;
  end record CoverageIDType;
  signal test : CoverageIDType;
begin
    test <= (ID => 5);
end architecture;
