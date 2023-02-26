entity test_postponed is
end entity;
architecture arch of test_postponed is
  signal a_unused, b : integer;
  procedure foo is
  begin
  end procedure;
begin
  postponed a_unused <= 5;
  label_process: postponed process is
  begin
    b <= b;
  end process;
  label_process2: postponed process is
  begin
    b <= b;
  end postponed process;
  label_procedure : postponed foo;
end architecture;
