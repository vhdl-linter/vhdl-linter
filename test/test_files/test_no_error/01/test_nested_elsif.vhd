entity test_nested_elsif is
end test_nested_elsif;
architecture arch of test_nested_elsif is


begin
  gen :
  if a_label    : true generate
  end a_label; -- optional end at the end of generate_statement_body
  elsif b_label : true generate
    begin
    gen_inner     : if d_label : true generate
    end; -- optional end at the end of generate_statement_body
    elsif e_label : true generate
    elsif f_label : true generate

    end generate gen_inner;
  else c_label : generate

  end generate gen;

end arch;
